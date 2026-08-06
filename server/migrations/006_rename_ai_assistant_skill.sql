DELETE legacy_grants
FROM user_access_grants AS legacy_grants
INNER JOIN user_access_grants AS current_grants
  ON current_grants.user_id = legacy_grants.user_id
  AND current_grants.scope_type = legacy_grants.scope_type
  AND current_grants.organization_id <=> legacy_grants.organization_id
  AND current_grants.grant_type = 'skill'
  AND current_grants.grant_code = 'ai-assistant'
WHERE legacy_grants.grant_type = 'skill'
  AND legacy_grants.grant_code = 'platform-assistant';

UPDATE user_access_grants
SET grant_code = 'ai-assistant'
WHERE grant_type = 'skill'
  AND grant_code = 'platform-assistant';
