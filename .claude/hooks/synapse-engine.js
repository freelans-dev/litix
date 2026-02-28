#!/usr/bin/env node
'use strict';

/**
 * Synapse Engine Hook — UserPromptSubmit
 *
 * Executes the 8-layer Synapse context injection pipeline on every user prompt.
 * Reads JSON from stdin, processes through SynapseEngine, outputs XML context
 * via hookSpecificOutput.additionalContext.
 *
 * MUST always exit 0 — context injection never blocks the user.
 */

const _hookBootTime = process.hrtime.bigint();

(async () => {
  try {
    const path = require('path');
    const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();

    // Read stdin (Claude Code hook protocol)
    let input = '';
    for await (const chunk of process.stdin) {
      input += chunk;
    }

    let parsed = {};
    try {
      parsed = JSON.parse(input);
    } catch {
      // Empty or malformed input is OK — we'll proceed with empty prompt
    }

    const hookInput = parsed.input || parsed;
    const prompt = hookInput.prompt || hookInput.user_prompt || '';
    const sessionId = hookInput.session_id || hookInput.sessionId || 'default';

    // Load hook runtime from .aios-core
    const runtimePath = path.join(cwd, '.aios-core', 'core', 'synapse', 'runtime', 'hook-runtime.js');
    const { resolveHookRuntime, buildHookOutput } = require(runtimePath);

    const runtime = resolveHookRuntime({ cwd, sessionId });
    if (!runtime) {
      // No .synapse/ dir or runtime error — silent no-op
      console.log(JSON.stringify(buildHookOutput('')));
      process.exit(0);
    }

    const { engine, session } = runtime;

    // Parse manifest for engine config
    const domainLoaderPath = path.join(cwd, '.aios-core', 'core', 'synapse', 'domain', 'domain-loader.js');
    const { parseManifest } = require(domainLoaderPath);
    const manifest = parseManifest(path.join(cwd, '.synapse', 'manifest'));

    // Execute the 8-layer pipeline
    const result = await engine.process(prompt, session, {
      manifest,
      _hookBootTime,
    });

    console.log(JSON.stringify(buildHookOutput(result.xml || '')));
    process.exit(0);
  } catch (err) {
    // Never fail — output empty context and exit 0
    try {
      console.log(JSON.stringify({
        hookSpecificOutput: { additionalContext: '' },
      }));
    } catch {
      // Truly desperate fallback — still exit 0
    }
    process.exit(0);
  }
})();
