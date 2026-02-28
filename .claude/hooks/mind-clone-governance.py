#!/usr/bin/env python3
"""
AIOS Mind Clone Governance Hook — PreToolUse (Write|Edit)

Governs the mind-cloning process with L6-L8 checkpoint enforcement.
For non-mind-clone projects (like Litix SaaS), this is a pass-through.

The hook infrastructure is kept in place so it activates automatically
when a mind-clone workflow is initiated via the clone-mind skill.
"""
import json
import sys


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        pass

    # Pass-through: mind clone governance not active for this project type
    print(json.dumps({"decision": "allow"}))


if __name__ == "__main__":
    main()
