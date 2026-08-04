export const siteOrigin = 'https://www.youngkx.cn';

export function absoluteUrl(pathname: string) {
  return new URL(pathname, siteOrigin).toString();
}
