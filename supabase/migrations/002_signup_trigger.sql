-- ═══════════════════════════════════════════════════════════════════
-- LITIX — Migration 002: Signup Trigger
-- Story: LITIX-1.2
--
-- When a new user signs up via Supabase Auth, this trigger:
-- 1. Creates a tenant (using the office_name from metadata)
-- 2. Creates a tenant_member with role = 'owner'
-- 3. Creates a profile
-- 4. Creates a subscription (free plan)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id    UUID;
  v_member_id    UUID;
  v_office_name  TEXT;
  v_slug         TEXT;
BEGIN
  -- Extract office name from user metadata
  v_office_name := COALESCE(
    NEW.raw_user_meta_data->>'office_name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Generate unique slug from office name
  v_slug := lower(regexp_replace(v_office_name, '[^a-zA-Z0-9]', '-', 'g'));
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(v_slug, '-');

  -- Ensure slug uniqueness by appending random suffix if needed
  WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = v_slug) LOOP
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
  END LOOP;

  -- Create tenant
  INSERT INTO tenants (name, slug, plan)
  VALUES (v_office_name, v_slug, 'free')
  RETURNING id INTO v_tenant_id;

  -- Create tenant_member (owner)
  INSERT INTO tenant_members (tenant_id, user_id, role, is_active)
  VALUES (v_tenant_id, NEW.id, 'owner', true)
  RETURNING id INTO v_member_id;

  -- Create profile
  INSERT INTO profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );

  -- Create free subscription
  INSERT INTO subscriptions (tenant_id, plan, status)
  VALUES (v_tenant_id, 'free', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
