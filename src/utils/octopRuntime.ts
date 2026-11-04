import {
  buildWorkspaceScopeKey,
  type WorkspaceScope,
} from '@/utils/workspaceState';

export const getOctopInstanceName = (
  userId: string | undefined,
  scope: WorkspaceScope | undefined,
) =>
  `octop:${encodeURIComponent(userId ?? 'anonymous')}:${scope ? buildWorkspaceScopeKey(scope) : 'platform'}`;

export async function destroyOctopInstance(name: string): Promise<void> {
  const { default: WujieReact } = await import('wujie-react');
  await WujieReact.destroyApp(name);
}
