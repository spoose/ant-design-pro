import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlatformStartConversation from './PlatformMockConversations';

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}));

vi.mock('@bible-strong/avatar-react', () => ({
  createAvatar: () => {
    const MockStrobiAvatar = () => <div data-testid="strobi-avatar" />;
    return MockStrobiAvatar;
  },
}));

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    generatePath,
    matchPath,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@ant-design/x', () => ({
  Prompts: ({
    items,
    onItemClick,
    title,
  }: {
    items: { key: string; label: ReactNode }[];
    onItemClick?: (info: { data: { key: string; label: ReactNode } }) => void;
    title?: ReactNode;
  }) => (
    <div>
      <h5>{title}</h5>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onItemClick?.({ data: item })}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
  Sender: ({
    onSubmit,
    placeholder,
    value,
    onChange,
  }: {
    onSubmit?: (message: string) => void;
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
  }) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(value ?? '');
      }}
    >
      <input
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
      <button type="submit">发送</button>
    </form>
  ),
}));

describe('PlatformStartConversation', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('sends a trimmed prompt to xOne instead of opening a blank chat', () => {
    render(<PlatformStartConversation />);

    fireEvent.change(screen.getByPlaceholderText('问问权限、用量或成员…'), {
      target: { value: '  本周用量为什么偏高  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送' }));

    expect(navigateMock).toHaveBeenCalledWith(
      '/workspace/platform/apps/ai-assistant/overview',
      { state: { prompt: '本周用量为什么偏高' } },
    );
  });

  it('launches xOne with a prompt chip label', () => {
    render(<PlatformStartConversation />);
    fireEvent.click(screen.getByRole('button', { name: '平台权限该怎么配' }));

    expect(navigateMock).toHaveBeenCalledWith(
      '/workspace/platform/apps/ai-assistant/overview',
      { state: { prompt: '平台权限该怎么配' } },
    );
  });

  it('does not navigate on an empty sender submit', () => {
    render(<PlatformStartConversation />);
    fireEvent.click(screen.getByRole('button', { name: '发送' }));
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
