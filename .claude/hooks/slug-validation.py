#!/usr/bin/env python3
"""
AIOS Slug Validation Hook — PreToolUse (Bash)

Validates agent/squad slug format in creation commands.
Slugs must be lowercase, start with a letter, and contain only
letters, numbers, and hyphens.

For non-creation commands, this is a pass-through.
"""
import json
import sys
import re


SLUG_PATTERN = re.compile(r'^[a-z][a-z0-9-]*$')
CREATION_KEYWORDS = ["create-agent", "create-squad", "squad-creator"]


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    command = data.get("tool_input", {}).get("command", "")
    if not command:
        print(json.dumps({"decision": "allow"}))
        sys.exit(0)

    # Only validate commands related to agent/squad creation
    if not any(keyword in command for keyword in CREATION_KEYWORDS):
        print(json.dumps({"decision": "allow"}))
        sys.exit(0)

    # Extract slug from --slug or --name flags
    parts = command.split()
    for i, part in enumerate(parts):
        if part in ("--slug", "--name", "-n") and i + 1 < len(parts):
            slug = parts[i + 1].strip("'\"")
            if not SLUG_PATTERN.match(slug):
                print(json.dumps({
                    "decision": "block",
                    "reason": (
                        f"[AIOS Slug Validation] Invalid slug '{slug}'. "
                        "Slugs must be lowercase, start with a letter, and contain "
                        "only letters, numbers, and hyphens (e.g., 'my-agent-1')."
                    )
                }))
                sys.exit(0)

    print(json.dumps({"decision": "allow"}))


if __name__ == "__main__":
    main()
