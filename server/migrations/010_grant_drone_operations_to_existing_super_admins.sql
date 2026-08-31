/*
 * 政务低空改为数据库应用授权：为现有 Super Admin 补齐 Project Scope Grant。
 * 010 必须位于应用授权类型迁移 009 之后，避免重新写入保留给 Agent Skill 的 skill。
 */
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
  'drone-operations',
  users.id
FROM users
WHERE users.is_super_admin = TRUE;

/*
 * 只补齐 Super Admin 已经加入的 Organization；新建 Organization 不自动授予。
 * 通过 organization_members 生成记录，满足 Organization Grant 的成员外键约束。
 */
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
  'organization',
  members.organization_id,
  'app',
  'drone-operations',
  users.id
FROM users
INNER JOIN organization_members AS members
  ON members.user_id = users.id
WHERE users.is_super_admin = TRUE;
