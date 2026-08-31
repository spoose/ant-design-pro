import {
  BankOutlined,
  FileTextOutlined,
  InboxOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { App, Button, Segmented, Select, Upload } from 'antd';
import { useState } from 'react';
import WorkspacePage from '@/components/WorkspacePage';
import { getAppDefinition } from '@/config/appRegistry';
import { uploadKnowledgeDocument } from './service';

const { Dragger } = Upload;
const MAX_FILE_CHARACTERS = 200_000;
const MAX_FILE_COUNT = 10;
const SUPPORTED_FILE_NAME = /\.(txt|md)$/i;

type KnowledgeFile = Pick<File, 'arrayBuffer' | 'name'>;

export async function validateKnowledgeFile(
  file: KnowledgeFile,
): Promise<string | undefined> {
  if (!SUPPORTED_FILE_NAME.test(file.name)) {
    return `${file.name} 不是 TXT 或 Markdown 文件`;
  }

  let content: string;
  try {
    content = new TextDecoder('utf-8', { fatal: true }).decode(
      await file.arrayBuffer(),
    );
  } catch {
    return `${file.name} 不是有效的 UTF-8 文本`;
  }

  if (!content.trim()) return `${file.name} 没有可上传的正文`;
  if (content.length > MAX_FILE_CHARACTERS) {
    return `${file.name} 超过 200,000 字符限制`;
  }
  return undefined;
}

type KnowledgeScopeType = 'personal' | 'organization';

export type KnowledgeUploadOrganization = {
  organizationId: string;
  organizationName: string;
};

type PaiResourcesPageProps = {
  fixedOrganizationId?: string;
  initialOrganizationId?: string;
  initialScopeType: KnowledgeScopeType;
  organizations: KnowledgeUploadOrganization[];
};

const PaiResourcesPage = ({
  fixedOrganizationId,
  initialOrganizationId,
  initialScopeType,
  organizations,
}: PaiResourcesPageProps) => {
  const { message } = App.useApp();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fixedOrganization = organizations.find(
    ({ organizationId }) => organizationId === fixedOrganizationId,
  );
  const defaultOrganizationId = fixedOrganization
    ? fixedOrganization.organizationId
    : organizations.some(
          ({ organizationId }) => organizationId === initialOrganizationId,
        )
      ? initialOrganizationId
      : organizations[0]?.organizationId;
  const [scopeType, setScopeType] = useState<KnowledgeScopeType>(
    initialScopeType === 'organization' && defaultOrganizationId
      ? 'organization'
      : 'personal',
  );
  const [organizationId, setOrganizationId] = useState(defaultOrganizationId);
  const selectedOrganization = organizations.find(
    (organization) => organization.organizationId === organizationId,
  );
  const canUpload =
    scopeType === 'personal' || Boolean(selectedOrganization?.organizationId);
  const uploadTargetLabel =
    scopeType === 'organization'
      ? selectedOrganization?.organizationName
      : '个人资料';

  const beforeUpload: UploadProps['beforeUpload'] = async (file) => {
    const validationError = await validateKnowledgeFile(file);
    if (validationError) {
      message.error(validationError);
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const uploadFiles = async () => {
    let uploadScope:
      | { scopeType: 'personal' }
      | { scopeType: 'organization'; organizationId: string };
    if (scopeType === 'personal') {
      uploadScope = { scopeType };
    } else {
      if (!selectedOrganization) return;
      uploadScope = {
        scopeType,
        organizationId: selectedOrganization.organizationId,
      };
    }
    const pendingFiles = [...fileList];
    let uploadedCount = 0;
    setUploading(true);
    try {
      for (const file of pendingFiles) {
        if (!file.originFileObj) throw new Error(`${file.name} 无法读取`);
        const content = new TextDecoder('utf-8', { fatal: true }).decode(
          await file.originFileObj.arrayBuffer(),
        );
        await uploadKnowledgeDocument({
          ...uploadScope,
          fileName: file.name,
          content,
        });
        uploadedCount += 1;
      }
      setFileList([]);
      message.success(`已上传 ${uploadedCount} 个资料`);
    } catch (error) {
      setFileList(pendingFiles.slice(uploadedCount));
      message.error(error instanceof Error ? error.message : '资料上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <WorkspacePage
      breadcrumb={[getAppDefinition('ai-assistant')?.title ?? 'xOneAI', '资源']}
      description="上传 TXT 或 Markdown 资料，作为后续知识检索与回答的可信来源。"
      title="资源"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="m-0 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                上传资料
              </h2>
            </div>
            <div>
              <Segmented<KnowledgeScopeType>
                aria-label="资料归属"
                disabled={uploading}
                name="knowledge-upload-scope"
                options={[
                  {
                    icon: <UserOutlined />,
                    label: '个人资料',
                    value: 'personal',
                  },
                  {
                    disabled: organizations.length === 0,
                    icon: <BankOutlined />,
                    label: '组织资料',
                    tooltip:
                      organizations.length === 0
                        ? '当前账号没有可上传的组织'
                        : undefined,
                    value: 'organization',
                  },
                ]}
                value={scopeType}
                onChange={setScopeType}
              />
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
            {scopeType === 'organization' ? (
              <>
                <label
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
                  htmlFor="knowledge-upload-organization"
                >
                  目标组织
                </label>
                {fixedOrganization ? (
                  <strong className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                    {fixedOrganization.organizationName}
                  </strong>
                ) : (
                  <Select
                    className="min-w-56 max-w-full"
                    disabled={uploading}
                    id="knowledge-upload-organization"
                    options={organizations.map((organization) => ({
                      label: organization.organizationName,
                      value: organization.organizationId,
                    }))}
                    value={organizationId}
                    onChange={setOrganizationId}
                  />
                )}
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {fixedOrganization ? '当前工作区' : '组织成员可按权限检索'}
                </span>
              </>
            ) : (
              <span className="text-sm text-zinc-600 dark:text-zinc-300">
                资料仅属于当前用户，不会进入任何组织知识库。
              </span>
            )}
          </div>

          <Dragger
            accept=".txt,.md,text/plain,text/markdown"
            beforeUpload={beforeUpload}
            className="block"
            disabled={!canUpload || uploading}
            fileList={fileList}
            maxCount={MAX_FILE_COUNT}
            multiple
            onChange={({ fileList: nextFileList }) => setFileList(nextFileList)}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽资料到此处</p>
            <p className="ant-upload-hint">
              支持 TXT、Markdown 和 UTF-8 编码；单个文件最多 200,000
              字符，一次最多 10 个文件。
            </p>
          </Dragger>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              已选择 {fileList.length} 个文件
            </span>
            <Button
              disabled={!canUpload || fileList.length === 0}
              icon={<UploadOutlined />}
              loading={uploading}
              type="primary"
              onClick={() => void uploadFiles()}
            >
              {uploadTargetLabel ? `上传到${uploadTargetLabel}` : '上传资料'}
            </Button>
          </div>
        </section>

        <aside className="grid content-start gap-4">
          <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              <FileTextOutlined aria-hidden />
            </div>
            <h2 className="m-0 text-base font-semibold text-zinc-950 dark:text-zinc-50">
              当前阶段
            </h2>
            <p className="mt-2 mb-0 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              资料正文直接写入 MySQL；文本切片和向量检索尚未接入。
            </p>
          </section>
        </aside>
      </div>
    </WorkspacePage>
  );
};

export default PaiResourcesPage;
