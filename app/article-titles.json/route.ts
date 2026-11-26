import { articles } from '@/lib/articles';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(
    Object.fromEntries(
      articles.map(({ path, title }) => [`/${path.join('/').normalize('NFC')}/`, title]),
    ),
  );
}
