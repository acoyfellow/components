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

function validateSvgUrl(urlString: string): void {
  const url = new URL(urlString);
  // Only allow http and https schemes to prevent SSRF attacks
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Invalid URL scheme. Only http and https are allowed.");
  }
  // Block private/internal IP ranges
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Access to private/internal addresses is not allowed.");
  }
}

async function getSvgData(request: Request): Promise<string> {
  if (request.method === "POST") {
    return request.text();
  }

  const url = new URL(request.url);
  const svgUrl = url.searchParams.get("url");
  const svgParam = url.searchParams.get("svg");

  if (svgUrl) {
    validateSvgUrl(svgUrl);
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
