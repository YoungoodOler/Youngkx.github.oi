import { articles } from '@/lib/articles';
import { friendLinksPath, friendLinksTitle } from '@/lib/useful-links';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(
    Object.fromEntries([
      [friendLinksPath, friendLinksTitle],
      ...articles.map(({ path, title }) => [`/${path.join('/').normalize('NFC')}/`, title]),
    ]),
  );
}
