/* 仅补齐现有 Super Admin 的平台应用授权；组织工作区仍按需授权。 */
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
  'app',
  'octop',
  users.id
FROM users
WHERE users.is_super_admin = TRUE;
