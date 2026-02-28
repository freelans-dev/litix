#!/usr/bin/env node
'use strict';

/**
 * PreCompact Session Digest Hook
 *
 * Captures session knowledge before Claude Code compacts the conversation.
 * Delegates to aios-pro's precompact-runner if available.
 * Without aios-pro: graceful no-op (registered for future availability).
 *
 * MUST always exit 0 — never block context compaction.
 */

(async () => {
  try {
    // Read stdin (required by Claude Code hook protocol)
    let input = '';
    for await (const chunk of process.stdin) {
      input += chunk;
    }

    // Try to load the precompact runner from .aios-core
    try {
      const path = require('path');
      const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
      const runnerPath = path.join(
        cwd, '.aios-core', 'hooks', 'unified', 'runners', 'precompact-runner.js'
      );
      const { onPreCompact } = require(runnerPath);
      const parsed = JSON.parse(input || '{}');
      await onPreCompact({
        sessionId: parsed.session_id || 'unknown',
        projectDir: cwd,
        conversation: parsed.conversation || {},
        provider: 'claude',
      });
    } catch {
      // pro-detector not available or runner failed — expected, silent no-op
    }

    // PreCompact hooks don't need hookSpecificOutput
    process.exit(0);
  } catch {
    process.exit(0);
  }
})();
