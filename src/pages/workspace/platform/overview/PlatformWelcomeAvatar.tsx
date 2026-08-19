import { Link } from '@umijs/max';
import { Avatar } from 'antd';
import { resolveUserAvatarUrl } from '@/utils/userAvatar';

type PlatformWelcomeAvatarProps = {
  avatar?: string | null;
  userName?: string;
};

/** 工作台欢迎区头像；与个人设置页共用 resolveUserAvatarUrl。 */
export const PlatformWelcomeAvatar = ({
  avatar,
  userName,
}: PlatformWelcomeAvatarProps) => {
  const displayName = userName?.trim() || '用户';

  return (
    <Link
      aria-label={`${displayName} 的个人设置`}
      className="inline-flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(0,0,0,0.89)]"
      to="/account/settings"
    >
      <Avatar
        alt={`${displayName} 的头像`}
        size={56}
        src={resolveUserAvatarUrl(avatar)}
      />
    </Link>
  );
};
