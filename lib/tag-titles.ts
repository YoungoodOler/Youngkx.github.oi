const tagTitles: Record<string, string> = {
  WEB: 'Web',
  VLOG: 'Vlog',
};

export function getTagTitle(tag: string) {
  return tagTitles[tag] ?? tag;
}
