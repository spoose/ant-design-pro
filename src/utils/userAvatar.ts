/** 用户无自定义头像时的统一默认图（顶栏与个人设置共用）。 */
export const DEFAULT_USER_AVATAR =
  'https://api.dicebear.com/10.x/lorelei/svg?seed=r40kblot&borderRadius=50&backgroundColor=74a7fe&backgroundColorFill=radial';
// 'https://api.dicebear.com/10.x/lorelei/svg?rotate=-360&borderRadius=50&backgroundColor=74a7fe&backgroundColorFill=radial&seed=caut0rrr'
/** 优先使用用户头像；为空时回退默认图。 */
export function resolveUserAvatarUrl(
  avatar: string | null | undefined,
): string {
  const trimmed = avatar?.trim();
  return trimmed || DEFAULT_USER_AVATAR;
}
