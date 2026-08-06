import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'migrations/005_pai_conversations.sql',
);

describe('pAI conversation migration', () => {
  it('creates the conversation, run, message, and source tables in dependency order', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    const conversationsPosition = sql.indexOf(
      'CREATE TABLE IF NOT EXISTS pai_conversations',
    );
    const runsPosition = sql.indexOf('CREATE TABLE IF NOT EXISTS pai_runs');
    const messagesPosition = sql.indexOf(
      'CREATE TABLE IF NOT EXISTS pai_messages',
    );
    const sourcesPosition = sql.indexOf(
      'CREATE TABLE IF NOT EXISTS pai_message_sources',
    );

    expect(conversationsPosition).toBeGreaterThanOrEqual(0);
    expect(runsPosition).toBeGreaterThan(conversationsPosition);
    expect(messagesPosition).toBeGreaterThan(runsPosition);
    expect(sourcesPosition).toBeGreaterThan(messagesPosition);
  });

  it('keeps Platform and Organization conversations mutually exclusive', async () => {
    const sql = await readFile(migrationPath, 'utf8');

    expect(sql).toContain("scope_type ENUM('platform', 'organization')");
    expect(sql).toContain(
      "(scope_type = 'platform' AND organization_id IS NULL)",
    );
    expect(sql).toContain(
      "(scope_type = 'organization' AND organization_id IS NOT NULL)",
    );
    expect(sql).toContain('FOREIGN KEY (owner_user_id) REFERENCES users (id)');
    expect(sql).toContain(
      'FOREIGN KEY (organization_id) REFERENCES organizations (id)',
    );
    expect(sql).toMatch(
      /pai_conversations_organization_id_fk[\s\S]*ON UPDATE RESTRICT ON DELETE RESTRICT/,
    );
  });

  it('uses one direct cascade chain without redundant parent references', async () => {
    const sql = await readFile(migrationPath, 'utf8');

    expect(sql).toContain('FOREIGN KEY (run_id) REFERENCES pai_runs (id)');
    expect(sql).toContain(
      'UNIQUE KEY pai_messages_run_role_unique (run_id, role)',
    );
    expect(sql).toMatch(
      /pai_runs_conversation_id_fk[\s\S]*ON UPDATE RESTRICT ON DELETE CASCADE/,
    );
    expect(sql).toMatch(
      /pai_messages_run_fk[\s\S]*ON UPDATE RESTRICT ON DELETE CASCADE/,
    );
    expect(sql).toMatch(
      /pai_message_sources_message_id_fk[\s\S]*ON UPDATE RESTRICT ON DELETE CASCADE/,
    );
    expect(sql).not.toContain('FOREIGN KEY (conversation_id, run_id)');
  });

  it('enforces idempotent ordered turns and terminal timestamps', async () => {
    const sql = await readFile(migrationPath, 'utf8');

    expect(sql).toContain('UNIQUE KEY pai_runs_conversation_turn_unique');
    expect(sql).toContain(
      'UNIQUE KEY pai_runs_conversation_idempotency_unique',
    );
    expect(sql).toContain("role = 'assistant' OR status = 'completed'");
    expect(sql).toContain(
      "status IN ('pending', 'streaming') AND completed_at IS NULL",
    );
    expect(sql).toContain(
      "status IN ('completed', 'failed', 'aborted') AND completed_at IS NOT NULL",
    );
    expect(sql).not.toContain('reasoning_content');
    expect(sql).not.toContain('deleted_at');
  });
});
