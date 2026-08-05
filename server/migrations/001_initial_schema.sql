CREATE TABLE IF NOT EXISTS organizations (
  id CHAR(36) NOT NULL,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY organizations_code_unique (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL,
  username VARCHAR(64) NOT NULL,
  email VARCHAR(254) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  avatar_url VARCHAR(2048) NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active', 'disabled', 'deleted') NOT NULL DEFAULT 'active',
  is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  default_organization_id CHAR(36) NULL,
  token_version INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at TIMESTAMP(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY users_username_unique (username),
  UNIQUE KEY users_email_unique (email),
  KEY users_default_organization_id_index (default_organization_id),
  CONSTRAINT users_default_organization_id_fk
    FOREIGN KEY (default_organization_id) REFERENCES organizations (id)
    ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (organization_id, user_id),
  KEY organization_members_user_id_index (user_id),
  CONSTRAINT organization_members_organization_id_fk
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT organization_members_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_access_grants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  scope_type ENUM('platform', 'organization') NOT NULL,
  organization_id CHAR(36) NULL,
  scope_organization_key VARCHAR(36)
    GENERATED ALWAYS AS (COALESCE(organization_id, '')) STORED,
  grant_type ENUM('permission', 'skill') NOT NULL,
  grant_code VARCHAR(128) NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY user_access_grants_scope_unique (
    user_id,
    scope_type,
    scope_organization_key,
    grant_type,
    grant_code
  ),
  KEY user_access_grants_organization_id_index (organization_id),
  KEY user_access_grants_created_by_index (created_by),
  CONSTRAINT user_access_grants_scope_check CHECK (
    (scope_type = 'platform' AND organization_id IS NULL)
    OR (scope_type = 'organization' AND organization_id IS NOT NULL)
  ),
  CONSTRAINT user_access_grants_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT user_access_grants_organization_id_fk
    FOREIGN KEY (organization_id) REFERENCES organizations (id),
  CONSTRAINT user_access_grants_created_by_fk
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
