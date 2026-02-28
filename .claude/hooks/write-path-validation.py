#!/usr/bin/env python3
"""
AIOS Write Path Validation Hook — PreToolUse (Write|Edit)

Validates that all write operations stay within the project directory.
Prevents path traversal attacks and accidental writes to system files.
"""
import json
import sys
import os


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    file_path = data.get("tool_input", {}).get("file_path", "")
    if not file_path:
        print(json.dumps({"decision": "allow"}))
        sys.exit(0)

    cwd = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
    resolved = os.path.realpath(file_path)
    project_root = os.path.realpath(cwd)

    # Allow writes within the project directory
    if resolved.startswith(project_root + os.sep) or resolved == project_root:
        print(json.dumps({"decision": "allow"}))
        sys.exit(0)

    # Allow writes to Claude Code's own directories (memory, plans, settings)
    home = os.path.expanduser("~")
    claude_dir = os.path.join(home, ".claude")
    if resolved.startswith(os.path.realpath(claude_dir) + os.sep):
        print(json.dumps({"decision": "allow"}))
        sys.exit(0)

    # Block everything else
        print(json.dumps({
            "decision": "block",
            "reason": (
                f"[AIOS Write Path Validation] Write target resolves outside the project directory. "
                f"Target: {file_path} -> {resolved}. "
                f"Project root: {project_root}. "
                "All writes must be within the project root."
            )
        }))


if __name__ == "__main__":
    main()
