import type { MenuDataItem } from '@ant-design/pro-components';
import { describe, expect, it } from 'vitest';
import { groupTemplateExampleMenus } from './menuData';

describe('groupTemplateExampleMenus', () => {
  it('groups template pages without changing their paths', () => {
    const menuData: MenuDataItem[] = [
      { path: '/home', name: 'Home' },
      { path: '/welcome', name: 'Welcome' },
      {
        path: '/form',
        name: 'Form',
        children: [
          { path: '/form/basic-form', name: 'Basic Form' },
          { path: '/form/step-form', name: 'Step Form' },
          { path: '/form/advanced-form', name: 'Advanced Form' },
        ],
      },
      { path: '/list', name: 'List' },
      { path: '/examples', name: 'Examples' },
    ];

    const result = groupTemplateExampleMenus(menuData);
    const form = result.find((item) => item.path === '/form');
    const examples = result.find((item) => item.path === '/examples');

    expect(result.map((item) => item.path)).toEqual([
      '/home',
      '/form',
      '/examples',
    ]);
    expect(form?.children?.map((item) => item.path)).toEqual([
      '/form/basic-form',
    ]);
    expect(examples?.children?.map((item) => item.path)).toEqual([
      '/welcome',
      '/form/step-form',
      '/form/advanced-form',
      '/list',
    ]);
  });
});
