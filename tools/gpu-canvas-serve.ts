import { readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import esbuild from "esbuild";
import { THEMES } from "./harness.ts";
import { radixInPictures } from "../packages/host-obsidian/radix-in-pictures.mts";

export interface ServedPages {
	readonly origin: string;
	readonly close: () => void;
}

export interface PageToServe {
	readonly entry: string;
	readonly html: string;
}

const FONT_FOLDERS: Readonly<Record<string, string>> = {
	"Inter_400Regular.ttf": "inter/400Regular",
	"Inter_500Medium.ttf": "inter/500Medium",
	"Inter_600SemiBold.ttf": "inter/600SemiBold",
	"SourceSerif4_400Regular.ttf": "source-serif-4/400Regular",
};

export const HOST_SIZES = "--font-ui-smaller: 12px; --font-ui-small: 14px; --font-ui-medium: 16px;";

export async function servedGpuPages(
	page: PageToServe = { entry: "tools/gpu-canvas-page.ts", html: pageHtml() },
): Promise<ServedPages> {
	const files = new Map<string, readonly [string, Buffer]>([
		["/", ["text/html; charset=utf-8", Buffer.from(page.html)]],
		["/page.js", ["text/javascript", await bundled(page.entry)]],
		["/gpu-worker.js", ["text/javascript", await bundled("tools/gpu-canvas-worker.ts")]],
		["/canvaskit.wasm", ["application/wasm", readFileSync("node_modules/canvaskit-wasm/bin/canvaskit.wasm")]],
		...Object.entries(FONT_FOLDERS).map(([file, folder]): [string, readonly [string, Buffer]] => [
			`/fonts/${file}`,
			["font/ttf", readFileSync(path.join("node_modules/@expo-google-fonts", folder, file))],
		]),
	]);
	const server = http.createServer((request, response) => {
		const served = files.get(new URL(request.url ?? "/", "http://localhost").pathname);
		if (!served) return void response.writeHead(404).end("not found");
		response.writeHead(200, { "content-type": served[0], "cache-control": "no-store" });
		response.end(served[1]);
	});
	await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
	const address = server.address();
	const port = typeof address === "object" && address !== null ? address.port : 0;
	return { origin: `http://127.0.0.1:${port}/`, close: () => server.close() };
}

async function bundled(entry: string): Promise<Buffer> {
	const built = await esbuild.build({
		plugins: [radixInPictures()],
		entryPoints: [entry],
		bundle: true,
		conditions: ["source"],
		write: false,
		format: "iife",
		platform: "browser",
		target: "es2022",
		jsxFactory: "h",
		jsxFragment: "Fragment",
		external: ["fs", "path"],
		define: { "process.env.NODE_ENV": JSON.stringify("production") },
		logLevel: "warning",
	});
	const [output] = built.outputFiles;
	if (!output) throw new Error(`esbuild wrote nothing for ${entry}`);
	return Buffer.from(output.contents);
}

function pageHtml(): string {
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("packages/host-obsidian/styles.css", "utf8")}</style>
<style>html, body { margin: 0; height: 100%; overflow: hidden; } #stage { position: fixed; inset: 0; display: block; width: 100vw; height: 100vh; }</style>
</head><body class="wg-root theme-light" style="${THEMES.light.replace(/\s+/g, " ")} ${HOST_SIZES}">
<canvas id="stage"></canvas>
<script src="/page.js"></script>
</body></html>`;
}
