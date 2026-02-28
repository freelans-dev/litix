#!/usr/bin/env python3
"""
AIOS SQL Governance Hook — PreToolUse (Bash)

Blocks inline DDL commands in bash (CREATE TABLE, ALTER TABLE, DROP TABLE, etc.).
Allows file-based execution (psql -f) and supabase CLI commands.

This enforces the architecture-first principle: SQL must be written to migration
files first, then executed via file-based tools — never as inline bash commands.
"""
import json
import sys
import re


DDL_PATTERNS = [
    re.compile(r'\bCREATE\s+TABLE\b', re.IGNORECASE),
    re.compile(r'\bALTER\s+TABLE\b', re.IGNORECASE),
    re.compile(r'\bDROP\s+TABLE\b', re.IGNORECASE),
    re.compile(r'\bCREATE\s+INDEX\b', re.IGNORECASE),
    re.compile(r'\bDROP\s+INDEX\b', re.IGNORECASE),
    re.compile(r'\bCREATE\s+SCHEMA\b', re.IGNORECASE),
    re.compile(r'\bDROP\s+SCHEMA\b', re.IGNORECASE),
    re.compile(r'\bTRUNCATE\b', re.IGNORECASE),
    re.compile(r'\bCREATE\s+OR\s+REPLACE\s+FUNCTION\b', re.IGNORECASE),
    re.compile(r'\bDROP\s+FUNCTION\b', re.IGNORECASE),
]


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    command = data.get("tool_input", {}).get("command", "")
    if not command:
        print(json.dumps({"decision": "allow"}))
        sys.exit(0)

    # Allow psql -f (file-based execution)
    if "psql" in command and "-f" in command:
        print(json.dumps({"decision": "allow"}))
        sys.exit(0)

    # Allow supabase CLI commands
    stripped = command.strip()
    if stripped.startswith("supabase") or "npx supabase" in command:
        print(json.dumps({"decision": "allow"}))
        sys.exit(0)

    # Check for inline DDL
    for pattern in DDL_PATTERNS:
        if pattern.search(command):
            print(json.dumps({
                "decision": "block",
                "reason": (
                    "[AIOS SQL Governance] Inline DDL detected in bash command. "
                    "Write your SQL to a migration file in supabase/migrations/ first, "
                    "then execute via 'psql -f <file>' or 'supabase db push'. "
                    "Inline DDL is blocked to ensure all schema changes are tracked and reviewable."
                )
            }))
            sys.exit(0)

    print(json.dumps({"decision": "allow"}))


if __name__ == "__main__":
    main()
