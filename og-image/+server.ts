import { Resvg } from '@cf-wasm/resvg';
import type { Fetcher } from '@cloudflare/workers-types';

import type { RequestHandler } from './$types';
type FontKey = 'GoogleSans' | 'GoogleSansMono';
let fontCache: Record<FontKey, Uint8Array | null> = { GoogleSans: null, GoogleSansMono: null };

async function loadFonts(
  fetchFn: typeof fetch,
  origin: string,
  assets?: Fetcher
) {
  if (fontCache.GoogleSans && fontCache.GoogleSansMono) return;

  const sansPath = '/fonts/Google_Sans_Flex/static/GoogleSansFlex_36pt-Bold.ttf';
  const monoPath = '/fonts/Google_Sans_Code/static/GoogleSansCode-Regular.ttf';

  // Use ASSETS binding if available (production), otherwise use origin fetch (dev)
  // ASSETS.fetch() requires a full URL, not a relative path
  const fetchSans = assets
    ? assets.fetch(new URL(sansPath, origin).toString())
    : fetchFn(`${origin}${sansPath}`);
  const fetchMono = assets
    ? assets.fetch(new URL(monoPath, origin).toString())
    : fetchFn(`${origin}${monoPath}`);

  const [sansRes, monoRes] = await Promise.all([fetchSans, fetchMono]);

  if (!sansRes.ok) throw new Error(`Failed to fetch sans font: ${sansRes.status}`);
  if (!monoRes.ok) throw new Error(`Failed to fetch mono font: ${monoRes.status}`);

  const [sansBuffer, monoBuffer] = await Promise.all([
    sansRes.arrayBuffer(),
    monoRes.arrayBuffer()
  ]);

  fontCache.GoogleSans = new Uint8Array(sansBuffer);
  fontCache.GoogleSansMono = new Uint8Array(monoBuffer);
}

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function resvgWithFonts(svg: string) {
  const sans = fontCache.GoogleSans;
  const mono = fontCache.GoogleSansMono;
  if (!sans || !mono) throw new Error('Fonts not loaded');

  return new Resvg(svg, {
    font: {
      fontBuffers: [sans, mono],
      defaultFontFamily: 'Google Sans Flex',
      sansSerifFamily: 'Google Sans Flex',
      monospaceFamily: 'Google Sans Code'
    },
    background: 'transparent',
    textRendering: 1,
    shapeRendering: 2,
    imageRendering: 0,
    dpi: 300
  });
}

function measureText(text: string, fontSize: number, fontFamily: string, fontWeight: number): number {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="200">
<text x="0" y="${fontSize}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}">${escapeXml(
    text
  )}</text>
</svg>`;

  const resvg = resvgWithFonts(svg);
  const bbox = resvg.getBBox();
  if (!bbox) throw new Error('Failed to measure text bbox');
  return bbox.width;
}

function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';
  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i];
    const width = measureText(testLine, fontSize, fontFamily, fontWeight);
    if (width < maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  return lines;
}

function generateOGImageSVG(title: string, description: string): string {
  const maxWidth = 1100;
  const titleFontSize = 56;
  const descFontSize = 28;
  const titleLineHeight = 68;
  const descLineHeight = 38;
  const startX = 51;

  const titleLines = wrapText(title, maxWidth, titleFontSize, 'Google Sans Flex', 700);
  const descLines = description ? wrapText(description, maxWidth, descFontSize, 'Google Sans Code', 400) : [];

  const maxTitleLines = 3;
  const maxDescLines = 2;
  const limitedTitleLines = titleLines.slice(0, maxTitleLines);
  const limitedDescLines = descLines.slice(0, maxDescLines);

  if (titleLines.length > maxTitleLines) {
    limitedTitleLines[maxTitleLines - 1] = limitedTitleLines[maxTitleLines - 1].slice(0, -3) + '...';
  }
  if (descLines.length > maxDescLines) {
    limitedDescLines[maxDescLines - 1] = limitedDescLines[maxDescLines - 1].slice(0, -3) + '...';
  }

  const titleStartY = 280;
  const descStartY = titleStartY + limitedTitleLines.length * titleLineHeight + 30;

  const titleText = limitedTitleLines
    .map((line, i) => {
      const y = titleStartY + i * titleLineHeight;
      return `<text x="${startX}" y="${y}" font-family="Google Sans Flex" font-size="${titleFontSize}" font-weight="700" fill="#0B0B0C">${escapeXml(
        line
      )}</text>`;
    })
    .join('\n');

  const descText = limitedDescLines
    .map((line, i) => {
      const y = descStartY + i * descLineHeight;
      return `<text x="${startX}" y="${y}" font-family="Google Sans Code" font-size="${descFontSize}" font-weight="400" fill="rgba(11,11,12,0.66)">${escapeXml(
        line
      )}</text>`;
    })
    .join('\n');

  return `<svg width="1200" height="680" viewBox="0 0 1200 680" xmlns="http://www.w3.org/2000/svg">
<defs>
<pattern id="dotgrid" width="24" height="24" patternUnits="userSpaceOnUse">
  <circle cx="1" cy="1" r="1" fill="rgba(11,11,12,0.06)"/>
</pattern>
</defs>
<rect width="1200" height="680" fill="#FAFAFB"/>
<rect width="1200" height="680" fill="url(#dotgrid)"/>
${titleText}
${descText}
</svg>`;
}

async function getSvgData(request: Request): Promise<string | null> {
  if (request.method === 'POST') return request.text();
  const url = new URL(request.url);
  const svgUrl = url.searchParams.get('url');
  const svgParam = url.searchParams.get('svg');
  if (svgUrl) {
    const res = await fetch(svgUrl);
    if (!res.ok) throw new Error(`Failed to fetch SVG: ${res.status}`);
    return res.text();
  }
  if (svgParam) return svgParam;
  return null;
}

function svgToPng(svg: string): Uint8Array {
  return resvgWithFonts(svg).render().asPng();
}

export const GET: RequestHandler = async ({ request, url, fetch, platform }) => {
  await loadFonts(fetch, url.origin, platform?.env?.ASSETS);

  const title = url.searchParams.get('title');
  const description = url.searchParams.get('description') || '';
  const format = url.searchParams.get('format');

  if (title) {
    const svg = generateOGImageSVG(title, description);
    if (format === 'svg') {
      return new Response(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }
    const png = svgToPng(svg);
    // @ts-ignore - Uint8Array ok
    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }

  const svg = await getSvgData(request);
  if (!svg) throw new Error("Missing SVG. Provide 'title', 'url', 'svg' param, or POST body");
  const png = svgToPng(svg);
  // @ts-ignore - Uint8Array ok
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};

export const POST: RequestHandler = async ({ request, url, fetch, platform }) => {
  await loadFonts(fetch, url.origin, platform?.env?.ASSETS);

  const svg = await getSvgData(request);
  if (!svg) throw new Error("Missing SVG. Provide 'url', 'svg' param, or POST body");
  const png = svgToPng(svg);
  // @ts-ignore - Uint8Array ok
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
