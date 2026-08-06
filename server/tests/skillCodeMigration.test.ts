import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'migrations/006_rename_ai_assistant_skill.sql',
);

describe('AI assistant skill code migration', () => {
  it('deduplicates and renames existing grants', async () => {
    const sql = await readFile(migrationPath, 'utf8');

    expect(sql).toContain("current_grants.grant_code = 'ai-assistant'");
    expect(sql).toContain("legacy_grants.grant_code = 'platform-assistant'");
    expect(sql.indexOf('DELETE legacy_grants')).toBeLessThan(
      sql.indexOf('UPDATE user_access_grants'),
    );
    expect(sql).toContain("SET grant_code = 'ai-assistant'");
  });
});
