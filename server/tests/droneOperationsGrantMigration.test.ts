import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'migrations/010_grant_drone_operations_to_existing_super_admins.sql',
);

describe('drone operations grant migration', () => {
  it('grants existing super admins at Project and existing Organization scopes', async () => {
    const sql = await readFile(migrationPath, 'utf8');

    expect(sql.match(/INSERT IGNORE INTO user_access_grants/g)).toHaveLength(2);
    expect(sql).toContain("'platform'");
    expect(sql).toContain("'organization'");
    expect(sql.match(/'app'/g)).toHaveLength(2);
    expect(sql).not.toContain("'skill'");
    expect(sql).toContain("'drone-operations'");
    expect(sql).toContain('INNER JOIN organization_members AS members');
    expect(sql).toContain('members.user_id = users.id');
    expect(sql).toContain('users.is_super_admin = TRUE');
  });
});
