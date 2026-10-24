import { readFileSync } from "node:fs";
import { HOST_SIZES } from "./gpu-canvas-serve.ts";
import { FIXTURE_UTILITIES } from "./gpu-design-fixture-sheet.ts";
import { THEMES } from "./harness.ts";

export function pageHtml(): string {
	const sheets = ["packages/shared/core/browser-host.css", "apps/host-obsidian/styles.css"].map((at) =>
		readFileSync(at, "utf8"),
	);
	const fonts = [400, 500, 600].map(
		(weight, at) =>
			`@font-face { font-family: Inter; font-weight: ${weight}; src: url(/fonts/${["Inter_400Regular", "Inter_500Medium", "Inter_600SemiBold"][at]}.ttf); }`,
	);
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${sheets.join("\n")}</style>
<style>${fonts.join("\n")}\n${FIXTURE_UTILITIES}</style>
<style>html, body { margin: 0; height: 100%; overflow: hidden; } #root { height: 100%; }</style>
</head><body class="wg-root theme-light" style="${THEMES.light.replace(/\s+/g, " ")} ${HOST_SIZES} --font-interface: Inter; --font-text: Inter;">
<div id="root"></div><pre id="boom"></pre>
<script src="/page.js"></script>
</body></html>`;
}
