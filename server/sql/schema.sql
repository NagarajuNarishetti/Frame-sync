-- Corrected version of your schema (safe to re-run)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keycloak_id VARCHAR(255),
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unique index for upsert logic
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='users_keycloak_id_unique'
  ) THEN
    CREATE UNIQUE INDEX users_keycloak_id_unique ON users(keycloak_id);
  END IF;
END
$$;

-- Media
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions (add needed FKs so unique constraint is valid)
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  media_id UUID REFERENCES media(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  can_read BOOLEAN DEFAULT false,
  can_write BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='uniq_user_media') THEN
    ALTER TABLE permissions ADD CONSTRAINT uniq_user_media UNIQUE (user_id, media_id);
  END IF;
END
$$;

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Optional Keycloak org id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='keycloak_org_id'
  ) THEN
    ALTER TABLE organizations ADD COLUMN keycloak_org_id VARCHAR(255);
  END IF;
END
$$;

-- Organization membership
CREATE TABLE IF NOT EXISTS organization_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner','reviewer','viewer')),
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS org_user_unique ON organization_users (organization_id, user_id);

-- Media sharing
CREATE TABLE IF NOT EXISTS media_shared (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_level VARCHAR(50) DEFAULT 'viewer',
  shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  message TEXT,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(media_id, shared_with)
);
-- Add org column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='media_shared' AND column_name='organization_id'
  ) THEN
    ALTER TABLE media_shared ADD COLUMN organization_id UUID REFERENCES organizations(id);
  END IF;
END
$$;
CREATE INDEX IF NOT EXISTS idx_media_shared_organization_id ON media_shared(organization_id);
CREATE INDEX IF NOT EXISTS idx_media_shared_media_id ON media_shared(media_id);
CREATE INDEX IF NOT EXISTS idx_media_shared_shared_with ON media_shared(shared_with);

-- Organization invites
CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_status CHECK (status IN ('pending','accepted','rejected')),
  CONSTRAINT no_self_invite CHECK (invited_user_id != invited_by),
  CONSTRAINT unique_invite UNIQUE (organization_id, invited_user_id, status)
);
CREATE INDEX IF NOT EXISTS idx_org_invites_user ON organization_invites(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_status ON organization_invites(status);
