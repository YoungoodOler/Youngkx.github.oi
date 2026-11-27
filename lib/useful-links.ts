import { author, githubProfileUrl } from './author';

export const friendLinksPath = '/links/';
export const friendLinksTitle = 'Links 友链';
export const maximumOwnerNoteLength = 2000;

export type UsefulLink = {
  id: string;
  title: string;
  href: string;
  description: string;
  avatar?: string;
};

export type UsefulLinkGroup = {
  id: string;
  title: string;
  description: string;
  links: UsefulLink[];
};

export const friendLinkTiers = [
  { id: 'youngkx', title: 'Youngkx' },
  { id: 'friends', title: 'Friends' },
  { id: 'friend-links', title: '友链' },
] as const;

export function organizeFriendLinks(groups: UsefulLinkGroup[]): UsefulLinkGroup[] {
  const organized = friendLinkTiers.map<UsefulLinkGroup>((tier) => ({
    ...tier,
    description: '',
    links: [],
  }));
  const [ownLinks, , generalLinks] = organized;
  for (const group of groups) {
    const currentTier = organized.find(
      (tier) => group.id === tier.id && group.title === tier.title,
    );
    if (currentTier) {
      currentTier.links.push(...group.links);
      continue;
    }
    for (const link of group.links) {
      const tier = link.href === githubProfileUrl ? ownLinks : generalLinks;
      tier.links.push(link);
    }
  }
  return organized;
}

export type UsefulLinksPayload = {
  version: 1;
  updatedAt: string | null;
  ownerNote?: string;
  groups: UsefulLinkGroup[];
};

export type UsefulLinksValidation =
  { ok: true; data: UsefulLinksPayload } | { ok: false; error: string };

const identifierPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validText(value: unknown, maximumLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximumLength;
}

function validUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2_048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function validAvatar(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2_048) return false;
  if (/^\/(?!\/)[^\\\p{Cc}]+$/u.test(value)) return true;
  return validUrl(value) && new URL(value).protocol === 'https:';
}

export function createEmptyUsefulLinksPayload(): UsefulLinksPayload {
  return { version: 1, updatedAt: null, groups: [] };
}

export function validateUsefulLinksPayload(value: unknown): UsefulLinksValidation {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.groups)) {
    return { ok: false, error: 'Links data has an invalid structure.' };
  }
  if (value.groups.length > 30) {
    return { ok: false, error: 'A maximum of 30 groups is supported.' };
  }
  if (value.updatedAt !== null && typeof value.updatedAt !== 'string') {
    return { ok: false, error: 'The update timestamp is invalid.' };
  }
  if (
    value.ownerNote !== undefined &&
    (typeof value.ownerNote !== 'string' || value.ownerNote.length > maximumOwnerNoteLength)
  ) {
    return { ok: false, error: `站长手记最多 ${maximumOwnerNoteLength} 字。` };
  }
  const ownerNote = value.ownerNote?.trim();

  const groupIds = new Set<string>();
  const linkIds = new Set<string>();
  const groups: UsefulLinkGroup[] = [];
  let linkCount = 0;

  for (const group of value.groups) {
    if (!isRecord(group) || !Array.isArray(group.links)) {
      return { ok: false, error: 'One of the groups is invalid.' };
    }
    if (
      typeof group.id !== 'string' ||
      !identifierPattern.test(group.id) ||
      groupIds.has(group.id) ||
      !validText(group.title, 80) ||
      typeof group.description !== 'string' ||
      group.description.length > 240
    ) {
      return { ok: false, error: 'Each group needs a unique id and a title.' };
    }
    groupIds.add(group.id);
    linkCount += group.links.length;
    if (linkCount > 300) return { ok: false, error: 'A maximum of 300 links is supported.' };

    const links: UsefulLink[] = [];
    for (const link of group.links) {
      if (
        !isRecord(link) ||
        typeof link.id !== 'string' ||
        !identifierPattern.test(link.id) ||
        linkIds.has(link.id) ||
        !validText(link.title, 120) ||
        !validUrl(link.href) ||
        !validText(link.description, 320)
      ) {
        return {
          ok: false,
          error: 'Each link needs a unique id, title, URL, and description.',
        };
      }
      const avatar = typeof link.avatar === 'string' ? link.avatar.trim() : link.avatar;
      if (avatar !== undefined && avatar !== '' && !validAvatar(avatar)) {
        return { ok: false, error: `「${link.title}」的头像需要使用 HTTPS 网址或站内图片路径。` };
      }
      linkIds.add(link.id);
      links.push({
        id: link.id,
        title: link.title,
        href: link.href,
        description: link.description,
        ...(avatar && { avatar }),
      });
    }
    groups.push({
      id: group.id,
      title: group.title,
      description: group.description,
      links,
    });
  }

  return {
    ok: true,
    data: {
      version: 1,
      updatedAt: value.updatedAt,
      ...(ownerNote && { ownerNote }),
      groups,
    },
  };
}

export function createDefaultFriendLinksPayload(): UsefulLinksPayload {
  return {
    ...createEmptyUsefulLinksPayload(),
    groups: organizeFriendLinks([
      {
        id: 'youngkx',
        title: 'Youngkx',
        description: '',
        links: [
          {
            id: 'youngkx-github',
            title: 'GitHub',
            href: githubProfileUrl,
            description: '@YoungoodOler',
            avatar: author.avatar,
          },
        ],
      },
    ]),
  };
}

export const usefulLinkCount = createDefaultFriendLinksPayload().groups.reduce(
  (total, group) => total + group.links.length,
  0,
);
