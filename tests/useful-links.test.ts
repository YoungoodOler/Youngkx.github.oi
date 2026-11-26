import { describe, expect, it } from 'vitest';
import {
  maximumOwnerNoteLength,
  organizeFriendLinks,
  validateUsefulLinksPayload,
} from '@/lib/useful-links';

const directory = {
  version: 1,
  updatedAt: null,
  groups: [
    {
      id: 'reference',
      title: 'Reference',
      description: 'Documentation and tools.',
      links: [
        {
          id: 'example',
          title: 'Example',
          href: 'https://example.com/',
          label: 'Website',
          description: 'A safe example link.',
        },
      ],
    },
  ],
} as const;

describe('useful links validation', () => {
  it('normalizes valid directory data', () => {
    const result = validateUsefulLinksPayload(directory);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.groups[0].links[0].href).toBe('https://example.com/');
  });

  it('rejects non-http URL protocols', () => {
    const result = validateUsefulLinksPayload({
      ...directory,
      groups: [
        {
          ...directory.groups[0],
          links: [{ ...directory.groups[0].links[0], href: 'javascript:alert(1)' }],
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      error: 'Each link needs a unique id, title, URL, label, and description.',
    });
  });

  it('rejects duplicate link identifiers across groups', () => {
    const result = validateUsefulLinksPayload({
      ...directory,
      groups: [
        directory.groups[0],
        {
          id: 'second-reference',
          title: 'Second Reference',
          description: 'Another group.',
          links: [directory.groups[0].links[0]],
        },
      ],
    });

    expect(result.ok).toBe(false);
  });

  it('preserves multiline notes and optional card photos and rejects invalid ones', () => {
    const group = directory.groups[0];
    const link = group.links[0];
    const result = validateUsefulLinksPayload({
      ...directory,
      ownerNote: '第一段。\n\n第二段。',
      groups: [{ ...group, links: [{ ...link, avatar: '/avatar.webp' }] }],
    });
    expect(result).toMatchObject({
      ok: true,
      data: {
        ownerNote: '第一段。\n\n第二段。',
        groups: [{ links: [{ avatar: '/avatar.webp' }] }],
      },
    });
    for (const avatar of [
      '//example.com/icon.png',
      'http://example.com/icon.png',
      'data:image/png;base64,example',
    ]) {
      expect(
        validateUsefulLinksPayload({
          ...directory,
          groups: [{ ...group, links: [{ ...link, avatar }] }],
        }).ok,
      ).toBe(false);
    }
    expect(
      validateUsefulLinksPayload({
        ...directory,
        ownerNote: 'X'.repeat(maximumOwnerNoteLength + 1),
      }).ok,
    ).toBe(false);
  });

  it('keeps old directory links when arranging them into the three tiers', () => {
    const group = directory.groups[0];
    const github = { ...group.links[0], id: 'github', href: 'https://github.com/YoungoodOler' };
    const organized = organizeFriendLinks([{ ...group, links: [...group.links, github] }]);
    expect(organized.map(({ title }) => title)).toEqual(['Youngkx', 'Friends', '友链']);
    expect(organized.map(({ links }) => links.map(({ id }) => id))).toEqual([
      ['github'],
      [],
      ['example'],
    ]);
  });
});
