import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  loadAllLocalKnowledgeMaterials,
  loadLocalKnowledgeMaterials,
} from '../src/ai/knowledge/loadLocalKnowledgeMaterials.js';
import { ResearchIntroductionService } from '../src/ai/services/researchIntroductionService.js';
import { createResearchIntroductionWorkflow } from '../src/ai/workflows/researchIntroductionWorkflow.js';

const temporaryDirectories: string[] = [];

async function createTemporaryArticlesDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'local-articles-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function writeArticle(
  rootDirectory: string,
  options: {
    sourceId: string;
    metadataSourceId?: string;
    title?: string;
    content?: string;
    writeMetadata?: boolean;
    writeContent?: boolean;
  },
): Promise<void> {
  const articleDirectory = join(rootDirectory, options.sourceId);
  await mkdir(articleDirectory, { recursive: true });

  if (options.writeMetadata !== false) {
    await writeFile(
      join(articleDirectory, 'metadata.json'),
      JSON.stringify({
        sourceId: options.metadataSourceId ?? options.sourceId,
        title: options.title ?? `标题 ${options.sourceId}`,
        originalFileName: `${options.sourceId}.txt`,
        mediaType: 'text/plain',
        ingestedAt: '2026-07-29T02:41:06Z',
        contentFile: 'content.md',
      }),
      'utf8',
    );
  }

  if (options.writeContent !== false) {
    await writeFile(
      join(articleDirectory, 'content.md'),
      options.content ?? `# 标题\n\n正文 ${options.sourceId}`,
      'utf8',
    );
  }
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

describe('local knowledge materials and research introduction service', () => {
  it('discovers and loads every article in stable sourceId order', async () => {
    const rootDirectory = await createTemporaryArticlesDirectory();
    await writeArticle(rootDirectory, {
      sourceId: 'article-002',
      content: '第二篇正文',
    });
    await writeArticle(rootDirectory, {
      sourceId: 'article-001',
      content: '第一篇正文',
    });
    await writeFile(join(rootDirectory, 'README.md'), '说明文件', 'utf8');

    const materials = await loadAllLocalKnowledgeMaterials(rootDirectory);

    expect(materials.map(({ sourceId }) => sourceId)).toEqual([
      'article-001',
      'article-002',
    ]);
    expect(materials.map(({ content }) => content)).toEqual([
      '第一篇正文',
      '第二篇正文',
    ]);
  });

  it('loads selected articles in sourceId order and runs the workflow', async () => {
    const rootDirectory = await createTemporaryArticlesDirectory();
    await writeArticle(rootDirectory, {
      sourceId: 'article-001',
      title: '救援案例',
      content: '# 救援案例\n\n无人机参与了山林救援。',
    });
    await writeArticle(rootDirectory, {
      sourceId: 'article-002',
      title: '防台案例',
      content: '# 防台案例\n\n无人机参与了台风防御。',
    });

    const generate = vi.fn().mockResolvedValue({
      text: '资料展示了低空设备的两类应用。[资料:article-002]',
    });
    const workflow = createResearchIntroductionWorkflow({ generate });
    const service = new ResearchIntroductionService(rootDirectory, workflow);

    const result = await service.generate({
      researchPurpose: '梳理低空技术的公共服务场景',
      interestDirections: ['应急响应', '跨部门协作'],
      sourceIds: ['article-002', 'article-001'],
    });

    expect(result.sources.map(({ sourceId }) => sourceId)).toEqual([
      'article-002',
      'article-001',
    ]);
    expect(result.introduction).toContain('[资料:article-002]');
    expect(generate).toHaveBeenCalledOnce();
    expect(generate.mock.calls[0]?.[0]).toContain(
      '<material index="1" sourceId="article-002">',
    );
    expect(generate.mock.calls[0]?.[0]).toContain('无人机参与了台风防御。');
  });

  it('rejects path traversal instead of reading an arbitrary path', async () => {
    const rootDirectory = await createTemporaryArticlesDirectory();

    await expect(
      loadLocalKnowledgeMaterials(rootDirectory, ['../secret']),
    ).rejects.toThrow('无效的资料 sourceId');
  });

  it.each([
    {
      missingFile: 'metadata.json',
      writeMetadata: false,
      writeContent: true,
    },
    {
      missingFile: 'content.md',
      writeMetadata: true,
      writeContent: false,
    },
  ])('reports a missing $missingFile explicitly', async ({
    missingFile,
    writeMetadata,
    writeContent,
  }) => {
    const rootDirectory = await createTemporaryArticlesDirectory();
    await writeArticle(rootDirectory, {
      sourceId: 'article-001',
      writeMetadata,
      writeContent,
    });
    await expect(
      loadLocalKnowledgeMaterials(rootDirectory, ['article-001']),
    ).rejects.toThrow(`资料 article-001 缺少 ${missingFile}`);
  });

  it('rejects metadata whose sourceId does not match its directory', async () => {
    const rootDirectory = await createTemporaryArticlesDirectory();
    await writeArticle(rootDirectory, {
      sourceId: 'article-001',
      metadataSourceId: 'article-999',
    });
    await expect(
      loadLocalKnowledgeMaterials(rootDirectory, ['article-001']),
    ).rejects.toThrow(
      '资料目录 article-001 与 metadata.sourceId article-999 不一致',
    );
  });

  it('rejects duplicate sourceIds before reading local files', async () => {
    const generate = vi.fn();
    const workflow = createResearchIntroductionWorkflow({ generate });
    const service = new ResearchIntroductionService(
      '/directory-not-read',
      workflow,
    );

    await expect(
      service.generate({
        researchPurpose: '测试重复资料',
        interestDirections: ['去重'],
        sourceIds: ['article-001', 'article-001'],
      }),
    ).rejects.toThrow('sourceId 不能重复');
    expect(generate).not.toHaveBeenCalled();
  });
});
