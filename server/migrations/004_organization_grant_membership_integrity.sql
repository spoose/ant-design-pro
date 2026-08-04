/*
 * 历史数据收敛：Organization Grant 没有对应 Membership 时不可继续保留，
 * 否则用户重新加入 Organization 后可能恢复旧授权。
 * Platform Grant 的 organization_id 为 NULL，不属于本次清理范围。
 */
DELETE grants
FROM user_access_grants AS grants
LEFT JOIN organization_members AS members
  ON members.organization_id = grants.organization_id
  AND members.user_id = grants.user_id
WHERE grants.scope_type = 'organization'
  AND members.user_id IS NULL;

/*
 * 核心完整性链路：
 * Organization Grant -> (organization_id, user_id) Membership。
 * scope_organization_key 是 organization_id 的存储生成列，因此 MySQL
 * 不允许这个外键使用 ON DELETE CASCADE。成员移除链路必须在同一事务中
 * 先删除 Grant、再删除 Membership；disabled 只改变状态，不删除 Grant。
 */
ALTER TABLE user_access_grants
  ADD KEY user_access_grants_membership_index (organization_id, user_id),
  ADD CONSTRAINT user_access_grants_membership_fk
    FOREIGN KEY (organization_id, user_id)
    REFERENCES organization_members (organization_id, user_id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT;
