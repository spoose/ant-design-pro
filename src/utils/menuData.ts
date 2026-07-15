import type { MenuDataItem } from '@ant-design/pro-components';

const exampleRootPaths = new Set([
  '/welcome',
  '/list',
  '/profile',
  '/result',
  '/exception',
  '/account',
]);
const exampleFormPaths = new Set(['/form/step-form', '/form/advanced-form']);

/**
 * 仅重组 ProLayout 菜单，不修改 Umi 路由；模板页面继续保留原 URL 和组件。
 */
export const groupTemplateExampleMenus = (menuData: MenuDataItem[]) => {
  const exampleItems: MenuDataItem[] = [];
  const primaryItems = menuData.flatMap((item) => {
    if (item.path && exampleRootPaths.has(item.path)) {
      exampleItems.push(item);
      return [];
    }

    if (item.path === '/form' && item.children) {
      const primaryChildren = item.children.filter((child) => {
        if (child.path && exampleFormPaths.has(child.path)) {
          exampleItems.push(child);
          return false;
        }
        return true;
      });
      return [{ ...item, children: primaryChildren }];
    }

    return [item];
  });

  return primaryItems.map((item) =>
    item.path === '/examples' ? { ...item, children: exampleItems } : item,
  );
};
