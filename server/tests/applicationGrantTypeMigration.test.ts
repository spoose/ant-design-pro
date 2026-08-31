import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'migrations/009_rename_application_grant_type.sql',
);

describe('application grant type migration', () => {
  it('renames existing application grants and reserves skill for Agent Skill', async () => {
    const sql = await readFile(migrationPath, 'utf8');

    expect(sql).toContain("ENUM('permission', 'app', 'skill')");
    expect(sql).toContain("SET grant_type = 'app'");
    expect(sql).toContain("WHERE grant_type = 'skill'");
  });
});
