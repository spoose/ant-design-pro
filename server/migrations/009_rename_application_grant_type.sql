/*
 * 现有 grant_type='skill' 记录实际表示普通应用授权。
 * 先扩展枚举，再把历史应用授权统一改为 app；skill 保留给未来 Agent Skill。
 */
ALTER TABLE user_access_grants
  MODIFY grant_type ENUM('permission', 'app', 'skill') NOT NULL;

UPDATE user_access_grants
SET grant_type = 'app'
WHERE grant_type = 'skill';
