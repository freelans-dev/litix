# Archived Migrations

These files were superseded during migration consolidation.
Their contents were merged into the canonical migration files.

| Archived File | Merged Into | Reason |
|---------------|-------------|--------|
| `001_multi_tenant_schema.sql` | `001_litix_schema.sql` | Duplicate 001. Tables `case_members` and `audit_log` merged into canonical 001. |
| `002_signup_trigger.sql` | `001_litix_schema.sql` | The `handle_new_user()` trigger was already present in 001. |
