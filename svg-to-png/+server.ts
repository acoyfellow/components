/**
 * SVG to PNG Converter - Cloudflare Worker
 * 
 * This worker converts SVG content to PNG images using @resvg/resvg-wasm.
 * 
 * Usage:
 * - GET with ?url=<encoded-svg-url> - Fetch SVG from URL and convert to PNG
 * - GET with ?svg=<encoded-svg> - Convert inline SVG to PNG
 * - POST with SVG body - Convert POSTed SVG to PNG
 * 
 * Example deployment with Wrangler:
 * ```
 * wrangler publish
 * ```
 * 
 * Note: This file is designed for Cloudflare Workers runtime.
 * For SvelteKit usage, see og-image-hybrid/+server.ts
 */

import { Resvg, initWasm } from "@resvg/resvg-wasm";
import wasm from "@resvg/resvg-wasm/index_bg.wasm";

let wasmInitialized = false;

async function ensureWasm() {
  if (wasmInitialized) return;
  try {
    await initWasm(wasm);
  } catch (err) {
    if (!(err instanceof Error && err.message.includes("Already initialized"))) throw err;
  }
  wasmInitialized = true;
}

async function getSvgData(request: Request): Promise<string> {
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

  throw new Error("Missing SVG. Provide 'url', 'svg' param, or POST body");
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

export default {
  async fetch(request: Request): Promise<Response> {
    await ensureWasm();

    try {
      const svg = await getSvgData(request);
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
      console.error("SVG error:", message);
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
