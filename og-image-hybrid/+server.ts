/**
 * Hybrid OG Image Generator - Cloudflare Worker
 * 
 * This worker combines OG image SVG generation with PNG conversion in a single endpoint.
 * It can either generate an OG image from title/description params OR convert an external SVG to PNG.
 * 
 * Usage:
 * - GET ?title=<title>&description=<desc> - Generate OG image PNG from title/description
 * - GET ?title=<title>&description=<desc>&format=svg - Return SVG instead of PNG
 * - GET ?url=<encoded-svg-url> - Fetch external SVG and convert to PNG
 * - GET ?svg=<encoded-svg> - Convert inline SVG to PNG
 * - POST with SVG body - Convert POSTed SVG to PNG
 * 
 * Note: This file is designed for Cloudflare Workers runtime.
 * Requires @resvg/resvg-wasm and opentype.js dependencies.
 */

import { Resvg, initWasm } from "@resvg/resvg-wasm";
import wasm from "@resvg/resvg-wasm/index_bg.wasm";
import opentype from "opentype.js";

let wasmInitialized = false;

// Font URLs (GitHub raw links)
const FONT_URLS = {
  SerifBold: "https://github.com/adobe-fonts/source-serif/raw/release/TTF/SourceSerif4-Bold.ttf",
  SansRegular: "https://github.com/erikdkennedy/figtree/raw/master/fonts/ttf/Figtree-Regular.ttf"
};

type FontKey = "SerifBold" | "SansRegular";

let fontCache: Record<FontKey, opentype.Font | null> = {
  SerifBold: null,
  SansRegular: null
};

async function ensureWasm() {
  if (wasmInitialized) return;
  try {
    await initWasm(wasm);
  } catch (err) {
    if (!(err instanceof Error && err.message.includes("Already initialized"))) throw err;
  }
  wasmInitialized = true;
}

async function loadFonts() {
  if (fontCache.SerifBold && fontCache.SansRegular) return;

  const [serifBuffer, sansBuffer] = await Promise.all([
    fetch(FONT_URLS.SerifBold).then(r => r.arrayBuffer()),
    fetch(FONT_URLS.SansRegular).then(r => r.arrayBuffer())
  ]);

  fontCache.SerifBold = opentype.parse(serifBuffer);
  fontCache.SansRegular = opentype.parse(sansBuffer);
}

function measureText(text: string, fontSize: number, fontKey: FontKey): number {
  const font = fontCache[fontKey];
  if (!font) throw new Error("Font not loaded");
  const path = font.getPath(text, 0, 0, fontSize);
  const bbox = path.getBoundingBox();
  return bbox.x2 - bbox.x1;
}

function wrapText(text: string, maxWidth: number, fontSize: number, fontKey: FontKey): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + " " + words[i];
    const width = measureText(testLine, fontSize, fontKey);

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

function getTextAsPath(text: string, x: number, y: number, fontSize: number, fontKey: FontKey): string {
  const font = fontCache[fontKey];
  if (!font) throw new Error("Font not loaded");
  const path = font.getPath(text, x, y, fontSize);
  return path.toPathData(2);
}

function generateOGImageSVG(title: string, description: string): string {
  // Layout constants
  const maxWidth = 1100; // Leave some padding (1200 - 100)
  const titleFontSize = 56;
  const descFontSize = 28;
  const titleLineHeight = 68;
  const descLineHeight = 38;
  const startX = 51;

  // Wrap text to fit
  const titleLines = wrapText(title, maxWidth, titleFontSize, "SerifBold");
  const descLines = description ? wrapText(description, maxWidth, descFontSize, "SansRegular") : [];

  // Limit lines to prevent overflow
  const maxTitleLines = 3;
  const maxDescLines = 2;
  const limitedTitleLines = titleLines.slice(0, maxTitleLines);
  const limitedDescLines = descLines.slice(0, maxDescLines);

  // Add ellipsis if truncated
  if (titleLines.length > maxTitleLines) {
    limitedTitleLines[maxTitleLines - 1] = limitedTitleLines[maxTitleLines - 1].slice(0, -3) + "...";
  }
  if (descLines.length > maxDescLines) {
    limitedDescLines[maxDescLines - 1] = limitedDescLines[maxDescLines - 1].slice(0, -3) + "...";
  }

  // Calculate Y positions - title starts at 280, description follows after
  const titleStartY = 280;
  const descStartY = titleStartY + (limitedTitleLines.length * titleLineHeight) + 30;

  // Generate path elements for each line
  const titlePaths = limitedTitleLines.map((line, i) => {
    const y = titleStartY + (i * titleLineHeight);
    const pathData = getTextAsPath(line, startX, y, titleFontSize, "SerifBold");
    return `<path d="${pathData}" fill="white"/>`;
  }).join("\n");

  const descPaths = limitedDescLines.map((line, i) => {
    const y = descStartY + (i * descLineHeight);
    const pathData = getTextAsPath(line, startX, y, descFontSize, "SansRegular");
    return `<path d="${pathData}" fill="white" opacity="0.7"/>`;
  }).join("\n");

  return `<svg width="1200" height="680" viewBox="0 0 1200 680" xmlns="http://www.w3.org/2000/svg">
<defs>
<linearGradient id="paint0_linear" x1="67.4636" y1="117.051" x2="180.956" y2="164.74" gradientUnits="userSpaceOnUse">
<stop stop-color="#D80000"/>
<stop offset="0.492662" stop-color="#FF0000"/>
</linearGradient>
</defs>
<rect width="1200" height="680" fill="black"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M160.291 137.245C165.835 167.748 192.754 190.89 225.126 190.89C257.499 190.89 284.417 167.748 289.96 137.245H270.442C265.227 157.225 246.916 171.982 225.126 171.982C203.337 171.982 185.026 157.225 179.811 137.245H160.291Z" fill="url(#paint0_linear)"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M160.253 137.025C155.116 157.117 136.75 171.982 114.881 171.982C89.0317 171.982 68.0767 151.213 68.0767 125.593C68.0767 99.9723 89.0317 79.2029 114.881 79.2029C136.75 79.2029 155.116 94.0683 160.253 114.16H179.756C174.301 83.5484 147.331 60.2953 114.881 60.2953C78.4959 60.2953 49.0001 89.5298 49.0001 125.593C49.0001 161.655 78.4959 190.89 114.881 190.89C147.331 190.89 174.301 167.637 179.756 137.025H160.253Z" fill="white"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M270.498 114.16C265.36 94.0683 246.996 79.2029 225.126 79.2029C203.257 79.2029 184.893 94.0683 179.756 114.16H160.253C165.707 83.5484 192.676 60.2953 225.126 60.2953C257.576 60.2953 284.548 83.5484 290 114.16H270.498Z" fill="#FF0000"/>
${titlePaths}
${descPaths}
</svg>`;
}

function svgToPng(svg: string): Uint8Array {
  const resvg = new Resvg(svg, {
    font: { loadSystemFonts: false },
    background: "transparent",
    textRendering: 1,
    shapeRendering: 2,
    imageRendering: 0,
    dpi: 300,
  });
  return resvg.render().asPng();
}

async function getSvgData(request: Request): Promise<string | null> {
  if (request.method === "POST") {
    return request.text();
  }

  const url = new URL(request.url);
  const svgUrl = url.searchParams.get("url");
  const svgParam = url.searchParams.get("svg");

  if (svgUrl) {
    const res = await fetch(svgUrl);
    if (!res.ok) throw new Error(`Failed to fetch SVG: ${res.status}`);
    return res.text();
  }

  if (svgParam) return svgParam;

  return null;
}

export default {
  async fetch(request: Request): Promise<Response> {
    await Promise.all([ensureWasm(), loadFonts()]);

    try {
      const url = new URL(request.url);
      const title = url.searchParams.get("title");
      const description = url.searchParams.get("description") || "";
      const format = url.searchParams.get("format");

      // If title is provided, generate OG image
      if (title) {
        const svg = generateOGImageSVG(title, description);
        
        // Return SVG if format=svg
        if (format === "svg") {
          return new Response(svg, {
            headers: {
              "Content-Type": "image/svg+xml",
              "Cache-Control": "public, max-age=31536000, immutable",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
        
        // Otherwise return PNG
        const png = svgToPng(svg);
        return new Response(png, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      // Otherwise, try to get SVG from url/svg param or POST body
      const svg = await getSvgData(request);
      if (!svg) {
        throw new Error("Missing SVG. Provide 'title', 'url', 'svg' param, or POST body");
      }

      const png = svgToPng(svg);
      return new Response(png, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("OG Image error:", message);
      return new Response(`Error: ${message}`, {
        status: message.includes("Missing SVG") ? 400 : 500,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};
