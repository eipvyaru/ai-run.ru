import { readFileSync, writeFileSync } from "node:fs";

const source = new URL("../public/favicon.svg", import.meta.url);
const target = new URL("../public/logo.svg", import.meta.url);
const favicon = readFileSync(source, "utf8");
const image = favicon.match(/href="(data:image\/png;base64,[A-Za-z0-9+/=]+)"/)?.[1];

if (!image || !favicon.includes('viewBox="0 0 512 512"')) {
  throw new Error("Unexpected favicon source; refusing to build the logo");
}

const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" fill="none">
  <title>AI-Run</title>
  <image x="3" y="8" width="101" height="101" href="${image}"/>
  <text x="112" y="84" font-family="Consolas,DejaVu Sans Mono,monospace" font-size="68" font-weight="700" fill="#3b82f6">AI<tspan fill="#8b5cf6">-Run</tspan></text>
  <rect x="342" y="92" width="44" height="14" fill="#8b5cf6"/>
</svg>\n`;

writeFileSync(target, logo, "utf8");
