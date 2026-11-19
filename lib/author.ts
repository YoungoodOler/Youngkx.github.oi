export type AuthorLinkKind = 'github' | 'linkedin' | 'douyin' | 'email';

export type AuthorLink = {
  kind: AuthorLinkKind;
  label: string;
  href: string;
};

export const author = {
  name: 'Youngkx',
  avatar: '/avatar.webp',
  links: [
    { kind: 'github', label: 'GitHub', href: 'https://github.com/YoungoodOler' },
    {
      kind: 'linkedin',
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/kian-yang-a88365447/',
    },
    { kind: 'douyin', label: '抖音', href: 'https://v.douyin.com/EpqN7ETfMFk/' },
    { kind: 'email', label: 'ykx756474427@gmail.com', href: 'mailto:ykx756474427@gmail.com' },
  ] satisfies AuthorLink[],
};
