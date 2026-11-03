const tagTitles: Record<string, string> = {
  C: 'C / C++',
  WEB: 'Web',
  VLOG: 'Vlog',
};

export function normalizeTag(tag: string) {
  const trimmed = tag.trim().normalize('NFC');
  const compact = trimmed.replace(/\s+/g, '').toLowerCase();
  return /^(?:c|c\+\+|c\/c\+\+)$/.test(compact) ? 'C' : tag;
}

export function getTagTitle(tag: string) {
  const normalized = normalizeTag(tag);
  return tagTitles[normalized] ?? normalized;
}
