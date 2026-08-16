export type UsefulLink = {
  id: string;
  title: string;
  href: string;
  label: string;
  description: string;
};

export type UsefulLinkGroup = {
  id: string;
  title: string;
  description: string;
  links: UsefulLink[];
};

export type UsefulLinksPayload = {
  version: 1;
  updatedAt: string | null;
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
      !validText(group.description, 240)
    ) {
      return { ok: false, error: 'Each group needs a unique id, title, and description.' };
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
        !validText(link.label, 40) ||
        !validText(link.description, 320)
      ) {
        return {
          ok: false,
          error: 'Each link needs a unique id, title, URL, label, and description.',
        };
      }
      linkIds.add(link.id);
      links.push({
        id: link.id,
        title: link.title,
        href: link.href,
        label: link.label,
        description: link.description,
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
      groups,
    },
  };
}

// Build-time fallback. Live data is loaded from /api/links after hydration.
export const usefulLinkGroups: UsefulLinkGroup[] = [];

export const usefulLinkCount = usefulLinkGroups.reduce(
  (total, group) => total + group.links.length,
  0,
);
