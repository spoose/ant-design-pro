CREATE TABLE IF NOT EXISTS pai_conversations (
  id CHAR(36) NOT NULL,
  owner_user_id CHAR(36) NOT NULL,
  scope_type ENUM('platform', 'organization') NOT NULL,
  organization_id CHAR(36) NULL,
  title VARCHAR(120) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY pai_conversations_owner_updated_index (
    owner_user_id,
    updated_at DESC,
    id
  ),
  KEY pai_conversations_scope_updated_index (
    owner_user_id,
    scope_type,
    organization_id,
    updated_at DESC,
    id
  ),
  CONSTRAINT pai_conversations_scope_check CHECK (
    (scope_type = 'platform' AND organization_id IS NULL)
    OR (scope_type = 'organization' AND organization_id IS NOT NULL)
  ),
  CONSTRAINT pai_conversations_owner_user_id_fk
    FOREIGN KEY (owner_user_id) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT pai_conversations_organization_id_fk
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*
 * 每次提问对应一个 Run。创建 Run 前，Repository 必须锁定 Conversation，
 * 检查该会话不存在 pending/streaming Run，再在同一事务中创建两条消息。
 */
CREATE TABLE IF NOT EXISTS pai_runs (
  id CHAR(36) NOT NULL,
  conversation_id CHAR(36) NOT NULL,
  turn_no BIGINT UNSIGNED NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  status ENUM('pending', 'streaming', 'completed', 'failed', 'aborted') NOT NULL,
  knowledge_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  web_search_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  model_provider VARCHAR(64) NOT NULL,
  model_name VARCHAR(128) NOT NULL,
  trace_id VARCHAR(128) NULL,
  input_tokens INT UNSIGNED NULL,
  output_tokens INT UNSIGNED NULL,
  error_code VARCHAR(128) NULL,
  started_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at TIMESTAMP(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY pai_runs_conversation_turn_unique (
    conversation_id,
    turn_no
  ),
  UNIQUE KEY pai_runs_conversation_idempotency_unique (
    conversation_id,
    idempotency_key
  ),
  KEY pai_runs_conversation_status_index (
    conversation_id,
    status,
    started_at
  ),
  CONSTRAINT pai_runs_completion_check CHECK (
    (status IN ('pending', 'streaming') AND completed_at IS NULL)
    OR (status IN ('completed', 'failed', 'aborted') AND completed_at IS NOT NULL)
  ),
  CONSTRAINT pai_runs_conversation_id_fk
    FOREIGN KEY (conversation_id) REFERENCES pai_conversations (id)
    ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*
 * Message 只引用直接父级 Run；所属 Conversation 和轮次均由 Run 推导。
 * 每个 Run 最多一条 User 和一条 Assistant 消息。
 */
CREATE TABLE IF NOT EXISTS pai_messages (
  id CHAR(36) NOT NULL,
  run_id CHAR(36) NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  status ENUM('pending', 'streaming', 'completed', 'failed', 'aborted') NOT NULL,
  content MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at TIMESTAMP(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY pai_messages_run_role_unique (run_id, role),
  CONSTRAINT pai_messages_user_status_check CHECK (
    role = 'assistant' OR status = 'completed'
  ),
  CONSTRAINT pai_messages_completion_check CHECK (
    (status IN ('pending', 'streaming') AND completed_at IS NULL)
    OR (status IN ('completed', 'failed', 'aborted') AND completed_at IS NOT NULL)
  ),
  CONSTRAINT pai_messages_run_fk
    FOREIGN KEY (run_id) REFERENCES pai_runs (id)
    ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS pai_message_sources (
  message_id CHAR(36) NOT NULL,
  source_id VARCHAR(128) NOT NULL,
  source_type ENUM('knowledge', 'web') NOT NULL,
  title VARCHAR(512) NOT NULL,
  source_url VARCHAR(2048) NULL,
  snippet TEXT NULL,
  published_at TIMESTAMP(3) NULL,
  source_updated_at TIMESTAMP(3) NULL,
  ordinal INT UNSIGNED NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (message_id, source_id),
  UNIQUE KEY pai_message_sources_message_ordinal_unique (message_id, ordinal),
  CONSTRAINT pai_message_sources_message_id_fk
    FOREIGN KEY (message_id) REFERENCES pai_messages (id)
    ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
