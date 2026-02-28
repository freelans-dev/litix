#!/usr/bin/env python3
"""
AIOS Read Protection Hook — PreToolUse (Read)

Blocks reads of sensitive files: .env*, credentials, secrets, PEM keys.
Allows .env.example for documentation purposes.
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

    basename = os.path.basename(file_path).lower()
    file_lower = file_path.lower()

    # Allow .env.example (documentation)
    if basename == ".env.example":
        print(json.dumps({"decision": "allow"}))
        sys.exit(0)

    # Block sensitive patterns
    blocked = (
        basename.startswith(".env")
        or "credentials" in file_lower
        or "secret" in basename
        or basename.endswith(".pem")
        or basename == "id_rsa"
        or basename == "id_ed25519"
    )

    if blocked:
        print(json.dumps({
            "decision": "block",
            "reason": (
                f"[AIOS Read Protection] Blocked read of sensitive file: {basename}. "
                "If you need this file, ask the user to provide the contents directly."
            )
        }))
    else:
        print(json.dumps({"decision": "allow"}))


if __name__ == "__main__":
    main()
