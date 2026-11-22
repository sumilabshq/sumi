import { readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { paged, waited } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";

const SHEETS = [
	"packages/shared/core/board.css",
	"apps/studio/dist/studio.css",
	"plugins/ai/chat-images/src/features/said-images/ui/said-image/said-image.css",
];
const HUES: Record<string, number> = {
	A: 210,
	B: 28,
	Desktop: 210,
	Phone: 28,
	Chart: 150,
	Table: 280,
	Banner: 350,
	Shot: 190,
	Icon: 60,
};
const bundle = await bundleOf("tools/scratch-bento-page.tsx");
const styles = SHEETS.map((sheet) => `<style>${readFileSync(sheet, "utf8")}</style>`).join("");
const PAGE = `<!doctype html><html><head><meta charset="utf-8">${styles}<style>body{margin:0;background:var(--plate)} h4{margin:16px 0 6px;font:600 13px var(--font-ui)}</style></head><body class="wg-studio"><div id="root"></div><script>${bundle}</script></body></html>`;

function svgOf(name: string, width: number, height: number): string {
	const hue = HUES[name] ?? 0;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}"><rect width="100%" height="100%" fill="hsl(${String(hue)} 50% 80%)"/><rect x="4%" y="4%" width="92%" height="8%" fill="hsl(${String(hue)} 30% 96%)"/><text x="50%" y="55%" font-family="sans-serif" font-size="${String(Math.max(10, height / 10))}" text-anchor="middle" fill="hsl(${String(hue)} 40% 25%)">${name} ${String(width)}×${String(height)}</text></svg>`;
}

const server = http.createServer((request, response) => {
	const picture = /^\/pic\/([^/]+)\/(\d+)\/(\d+)\.svg$/.exec(request.url ?? "");

	if (picture !== null) {
		response.setHeader("content-type", "image/svg+xml");
		response.end(svgOf(picture[1] ?? "", Number(picture[2]), Number(picture[3])));
		return;
	}

	response.setHeader("content-type", "text/html");
	response.end(PAGE);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const port = typeof address === "object" && address !== null ? address.port : 0;

const PROBE = `(() => { const c = document.querySelector(".wg-studio-ai-caption"); const f = c.closest(".wg-studio-ai-figure"); const i = f.querySelector("img"); const s = getComputedStyle(c); return { cap: [c.getBoundingClientRect().top, c.getBoundingClientRect().height, s.position, s.bottom], fig: [f.getBoundingClientRect().top, f.getBoundingClientRect().height, getComputedStyle(f).position], img: [i.getBoundingClientRect().top, i.getBoundingClientRect().height, getComputedStyle(i).height] }; })(), [...document.querySelectorAll("section")].map((section) => {
	const gallery = section.querySelector(".wg-studio-ai-gallery");
	const box = gallery.getBoundingClientRect();
	return { case: section.dataset.case, bento: gallery.hasAttribute("data-bento"), height: Math.round(box.height), tiles: [...gallery.children].map((figure) => { const r = figure.getBoundingClientRect(); return [Math.round(r.left - box.left), Math.round(r.top - box.top), Math.round(r.width), Math.round(r.height), figure.hasAttribute("data-bento-small") ? "small" : ""]; }) };
})`;

const CAPTION_PROBE = `(() => { const c = document.querySelector(".wg-studio-ai-caption"); const f = c.closest(".wg-studio-ai-figure"); const i = f.querySelector("img"); const s = getComputedStyle(c); return { cap: [c.getBoundingClientRect().top, c.getBoundingClientRect().height, s.position, s.bottom, c.parentElement.className], fig: [f.getBoundingClientRect().top, f.getBoundingClientRect().height, getComputedStyle(f).position], img: [i.getBoundingClientRect().top, i.getBoundingClientRect().height] }; })()`;

try {
	const page = await paged(`http://127.0.0.1:${String(port)}/`, "bento check", { size: [700, 2450] });
	try {
		await waited(1500);
		console.log(JSON.stringify(await page.ask(PROBE), null, 1));
		console.log(JSON.stringify(await page.ask(CAPTION_PROBE)));
		writeFileSync("/tmp/bento/real.png", await page.shoot());
		console.log("screenshot: /tmp/bento/real.png");
	} finally {
		page.close();
	}
} finally {
	server.close();
}
