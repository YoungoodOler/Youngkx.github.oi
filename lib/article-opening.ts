const entities: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

export function getArticleOpening(html: string) {
  const limit = 650;
  // Use the rendered body for both Markdown and legacy HTML articles.
  const prose = html.replace(
    /<!--[\s\S]*?-->|<div class="ds-map">[\s\S]*?<\/div>|<(details|figure|nav|pre|script|style|table)\b[^>]*>[\s\S]*?<\/\1>/gi,
    '',
  );
  const opening: string[] = [];
  let length = 0;
  for (const [, , block] of prose.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    if (/^\s*<a\b[^>]*>[^<]*<\/a>\s*$/i.test(block)) continue;
    const text = block
      .replace(/<annotation\b[^>]*>[\s\S]*?<\/annotation>/gi, '')
      .replace(/<\/(?:p|li)>|<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (reference: string, entity: string) => {
        if (!entity.startsWith('#'))
          return Object.hasOwn(entities, entity) ? entities[entity] : reference;
        const hex = entity[1].toLowerCase() === 'x';
        const codePoint = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
        return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : reference;
      })
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;

    const characters = Array.from(text);
    const remaining = limit - length;
    if (characters.length > remaining) {
      if (remaining > 0) opening.push(characters.slice(0, remaining).join('').trimEnd());
      opening[opening.length - 1] += '…';
      break;
    }
    opening.push(text);
    length += characters.length;
  }
  return opening;
}
