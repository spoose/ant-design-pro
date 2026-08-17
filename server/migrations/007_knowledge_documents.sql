CREATE TABLE IF NOT EXISTS knowledge_sources (
  id CHAR(36) NOT NULL,
  scope_type ENUM('personal', 'organization') NOT NULL,
  owner_user_id CHAR(36) NULL,
  organization_id CHAR(36) NULL,
  created_by_user_id CHAR(36) NOT NULL,
  source_type ENUM('upload') NOT NULL DEFAULT 'upload',
  name VARCHAR(255) NOT NULL,
  media_type ENUM('text/plain', 'text/markdown') NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY knowledge_sources_owner_created_index (owner_user_id, created_at DESC),
  KEY knowledge_sources_organization_created_index (organization_id, created_at DESC),
  CONSTRAINT knowledge_sources_scope_check CHECK (
    (scope_type = 'personal' AND owner_user_id IS NOT NULL AND organization_id IS NULL)
    OR (scope_type = 'organization' AND owner_user_id IS NULL AND organization_id IS NOT NULL)
  ),
  CONSTRAINT knowledge_sources_owner_user_id_fk
    FOREIGN KEY (owner_user_id) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT knowledge_sources_organization_id_fk
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT knowledge_sources_created_by_user_id_fk
    FOREIGN KEY (created_by_user_id) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id CHAR(36) NOT NULL,
  source_id CHAR(36) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  character_count INT UNSIGNED NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY knowledge_documents_source_unique (source_id),
  CONSTRAINT knowledge_documents_content_check CHECK (character_count > 0),
  CONSTRAINT knowledge_documents_source_id_fk
    FOREIGN KEY (source_id) REFERENCES knowledge_sources (id)
    ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
