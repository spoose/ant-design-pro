ALTER TABLE organizations
  ADD COLUMN created_by CHAR(36) NULL AFTER status,
  ADD KEY organizations_created_by_index (created_by),
  ADD CONSTRAINT organizations_created_by_fk
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;

INSERT IGNORE INTO user_access_grants (
  user_id,
  scope_type,
  organization_id,
  grant_type,
  grant_code,
  created_by
)
SELECT
  users.id,
  'platform',
  NULL,
  'skill',
  skills.grant_code,
  users.id
FROM users
CROSS JOIN (
  SELECT 'platform-assistant' AS grant_code
  UNION ALL SELECT 'file-review'
  UNION ALL SELECT 'document-summary'
  UNION ALL SELECT 'knowledge-search'
) AS skills
WHERE users.is_super_admin = TRUE;
