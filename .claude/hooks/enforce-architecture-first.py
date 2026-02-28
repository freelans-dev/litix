#!/usr/bin/env python3
"""
AIOS Enforce Architecture First Hook — PreToolUse (Write|Edit)

Blocks writes to supabase/functions/ and supabase/migrations/ unless
an approved plan document exists in docs/approved-plans/.

This ensures database changes follow the architecture-first principle:
plan doc → review → then implementation.
"""
import json
import sys
import os


PROTECTED_PREFIXES = ["supabase/functions/", "supabase/migrations/"]
PLANS_DIR = "docs/approved-plans"


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

    # Normalize to relative path
    if os.path.isabs(file_path):
        try:
            rel_path = os.path.relpath(file_path, cwd)
        except ValueError:
            rel_path = file_path
    else:
        rel_path = file_path

    # Normalize separators
    rel_path = rel_path.replace("\\", "/")

    # Check if path is protected
    is_protected = any(rel_path.startswith(prefix) for prefix in PROTECTED_PREFIXES)
    if not is_protected:
        print(json.dumps({"decision": "allow"}))
        sys.exit(0)

    # Check for approved plan docs
    plans_path = os.path.join(cwd, PLANS_DIR)
    if os.path.isdir(plans_path):
        plan_files = [f for f in os.listdir(plans_path) if f.endswith((".md", ".yaml", ".yml"))]
        if plan_files:
            print(json.dumps({"decision": "allow"}))
            sys.exit(0)

    print(json.dumps({
        "decision": "block",
        "reason": (
            f"[AIOS Architecture First] Cannot write to {rel_path} without an approved plan document. "
            f"Create a plan doc in {PLANS_DIR}/ first (e.g., migration-{os.path.basename(rel_path)}.md), "
            "then retry. This ensures database changes are reviewed before implementation."
        )
    }))


if __name__ == "__main__":
    main()
