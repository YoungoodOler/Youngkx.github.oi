import { describe, expect, it } from 'vitest';
import { validateUsefulLinksPayload } from '@/lib/useful-links';

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
});
