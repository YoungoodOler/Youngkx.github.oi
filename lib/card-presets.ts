export const CARD_PRESETS = [
  'code',
  'cs',
  'ai',
  'vlog',
  'talk',
  'web',
  'network',
  'timeline',
] as const;

export type CardPreset = (typeof CARD_PRESETS)[number];

export function isCardPreset(value: unknown): value is CardPreset {
  return typeof value === 'string' && CARD_PRESETS.includes(value.toLowerCase() as CardPreset);
}

export function inferCardPreset(tags: string[], index = 0): CardPreset {
  const normalized = tags.map((tag) => tag.trim().toLowerCase());
  const has = (...candidates: string[]) => candidates.some((candidate) => normalized.includes(candidate));

  if (has('ai', 'ml', '机器学习', '人工智能', 'llm')) return 'ai';
  if (has('vlog', '摄影', '旅行', '生活')) return 'vlog';
  if (has('闲谈', '随笔', '日记', '想法', 'talk')) return 'talk';
  if (has('web', '前端', 'http', 'javascript', 'typescript')) return 'web';
  if (has('c', 'c++', '代码', '编程')) return 'code';
  if (has('cs', 'oi', '算法', '计算机')) return index % 2 === 0 ? 'cs' : 'network';
  return index % 2 === 0 ? 'timeline' : 'network';
}

export function cardTone(card: CardPreset): 'mint' | 'blue' | 'violet' | 'amber' | 'rose' {
  if (card === 'code') return 'mint';
  if (card === 'vlog') return 'amber';
  if (card === 'talk') return 'rose';
  if (card === 'ai' || card === 'timeline') return 'violet';
  return 'blue';
}
