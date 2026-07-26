CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  token_hash BINARY(32) NOT NULL,
  expires_at TIMESTAMP(3) NOT NULL,
  used_at TIMESTAMP(3) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY password_reset_tokens_hash_unique (token_hash),
  KEY password_reset_tokens_user_id_index (user_id),
  KEY password_reset_tokens_expires_at_index (expires_at),
  CONSTRAINT password_reset_tokens_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
