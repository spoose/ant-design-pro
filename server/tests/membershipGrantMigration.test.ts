import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'migrations/004_organization_grant_membership_integrity.sql',
);

describe('Organization Grant Membership migration', () => {
  it('removes only orphan Organization Grants before adding the constraint', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    const deletePosition = sql.indexOf('DELETE grants');
    const constraintPosition = sql.indexOf(
      'ADD CONSTRAINT user_access_grants_membership_fk',
    );

    expect(deletePosition).toBeGreaterThanOrEqual(0);
    expect(sql).toContain("WHERE grants.scope_type = 'organization'");
    expect(sql).toContain('members.organization_id = grants.organization_id');
    expect(sql).toContain('members.user_id = grants.user_id');
    expect(sql).toContain('members.user_id IS NULL');
    expect(constraintPosition).toBeGreaterThan(deletePosition);
  });

  it('binds Organization Grants to Membership and blocks unsafe deletion', async () => {
    const sql = await readFile(migrationPath, 'utf8');

    expect(sql).toContain('FOREIGN KEY (organization_id, user_id)');
    expect(sql).toContain(
      'REFERENCES organization_members (organization_id, user_id)',
    );
    expect(sql).toContain('ON UPDATE RESTRICT');
    expect(sql).toContain('ON DELETE RESTRICT');
    expect(sql).not.toMatch(/^\s*ON DELETE CASCADE;/m);
    expect(sql).not.toMatch(/DELETE[\s\S]*members\.status\s*=\s*'disabled'/);
  });
});
