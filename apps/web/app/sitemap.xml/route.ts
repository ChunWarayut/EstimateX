import { NextResponse } from 'next/server';

export async function GET() {
  const urls = ['/', '/donate'];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `<url><loc>${`https://estimatex.local${u}`}</loc></url>`)
    .join('\n')}\n</urlset>`;
  return new NextResponse(body, { headers: { 'Content-Type': 'application/xml' } });
}

