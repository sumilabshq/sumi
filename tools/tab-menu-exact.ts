import { readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { isRecord } from "./page-dom.ts";
import { differences } from "./studio-tabs-diff.ts";
import type { Difference } from "./studio-tabs-diff.ts";

export async function exactMenuReport(): Promise<MenuExactReport> {
	const measured: Record<string, unknown> = {};
	const found: Record<string, readonly Difference[]> = {};
	const built = await builtPage();

	try {
		for (const [theme, file] of THEMES) {
			const board = await boardOf(file);
			const ours = await builtOf(built.page, theme);
			found[theme] = differences(board, ours, theme);
			measured[theme] = { board, built: ours };
		}
	} finally {
		built.stop();
	}

	const light = found["light"] ?? [];
	const dark = found["dark"] ?? [];
	return { differences: light.length + dark.length, light, dark, measured };
}

export interface MenuExactReport {
	readonly differences: number;
	readonly light: readonly Difference[];
	readonly dark: readonly Difference[];
	readonly measured: Readonly<Record<string, unknown>>;
}

interface MenuParts {
	readonly panel: string;
	readonly row: string;
	readonly hint: string;
	readonly separator: string;
}

const REPO = path.resolve(import.meta.dirname, "..");
const BOARDS = path.join(REPO, "docs/reference/tab-menu");
const THEMES = [
	["light", "TabMenu.dc.html"],
	["dark", "TabMenuDark.dc.html"],
] as const;
const BOARD_PARTS: MenuParts = {
	panel: ".cm[aria-label='Tab menu']",
	row: ".mr",
	hint: "kbd",
	separator: ".msep",
};
const BUILT_PARTS: MenuParts = {
	panel: ".wg-kit-pop.is-open",
	row: "[data-host-tab-action]",
	hint: ".wg-kit-menu-shortcut",
	separator: ".wg-kit-pop-sep",
};
const SHEETS = ["packages/core/browser-host.css", "packages/host-obsidian/styles.css"];
const THEMED = `((theme) => { document.body.classList.toggle("theme-dark", theme === "dark"); document.body.classList.toggle("theme-light", theme === "light"); return true; })`;
const CONTEXT_ON_RAIL = `(() => { const tab = [...document.querySelectorAll("[data-host-rail-tab]")].find((one) => one.getClientRects().length > 0 && getComputedStyle(one).visibility === "visible"); if (!tab) return false; const box = tab.getBoundingClientRect(); const x = box.left + box.width / 2; const y = box.top + box.height / 2; tab.dispatchEvent(new MouseEvent("contextmenu", { clientX: x, clientY: y, button: 2, bubbles: true, cancelable: true })); return true; })()`;
const OPEN_COLUMN = `(() => { document.querySelector("[data-host-all-tabs]")?.click(); return true; })()`;
const MENU_PROBE = `((parts) => {
	const px = (value) => Math.round(parseFloat(value) * 10) / 10;
	const alphaOf = (colour) => { const slash = colour.match(/\\/\\s*([\\d.]+)\\s*\\)$/); if (slash) return Number(slash[1]); const rgba = colour.match(/^rgba\\([^,]+,[^,]+,[^,]+,\\s*([\\d.]+)\\)$/); return rgba ? Number(rgba[1]) : 1; };
	const panel = [...document.querySelectorAll(parts.panel)].at(-1);
	if (!panel) return null;
	const style = getComputedStyle(panel);
	const row = [...panel.querySelectorAll(parts.row)].find((one) => !one.matches("[disabled], .off")) ;
	const rowStyle = getComputedStyle(row);
	const rowFill = getComputedStyle(row, "::before").content !== "none" && getComputedStyle(row, "::before").borderTopLeftRadius !== "0px" ? getComputedStyle(row, "::before") : rowStyle;
	const icon = row.querySelector("svg");
	const hint = panel.querySelector(parts.hint);
	const separator = panel.querySelector(parts.separator);
	const sepStyle = getComputedStyle(separator);
	const box = panel.getBoundingClientRect();
	const rowBox = row.getBoundingClientRect();
	const iconBox = icon.getBoundingClientRect();
	const label = [...row.childNodes].find((node) => node.nodeType === 3 || node.nodeName === "SPAN");
	const range = document.createRange();
	range.selectNodeContents(label);
	const labelBox = range.getBoundingClientRect();
	return {
		width: Math.round(box.width),
		corner: px(style.borderTopLeftRadius),
		filter: style.backdropFilter || style.webkitBackdropFilter,
		alpha: alphaOf(style.backgroundColor),
		pad: px(getComputedStyle(row.parentElement.closest(".wg-kit-pop-inner") ?? panel).paddingLeft),
		row: { height: Math.round(rowBox.height), radius: Math.min(px(rowFill.borderTopLeftRadius), rowBox.height / 2), font: rowStyle.fontSize + " " + rowStyle.fontWeight, iconFromLeft: Math.round(iconBox.left - rowBox.left), icon: Math.round(iconBox.width), gap: Math.round(labelBox.left - iconBox.right) },
		hint: { size: getComputedStyle(hint).fontSize, fromRight: Math.round(hint.closest(parts.row).getBoundingClientRect().right - hint.getBoundingClientRect().right) },
		separator: { height: px(sepStyle.height), across: px(sepStyle.marginLeft), above: px(sepStyle.marginTop) },
	};
})`;

async function boardOf(file: string): Promise<Record<string, unknown>> {
	const page = await paged(path.join(BOARDS, file), "tab menu board", { size: [1700, 1200] });

	try {
		await waited(2000);
		const asked = await page.ask(`${MENU_PROBE}(${JSON.stringify(BOARD_PARTS)})`);
		return isRecord(asked) ? asked : {};
	} finally {
		page.close();
	}
}

async function builtOf(page: AskedPage, theme: string): Promise<Record<string, unknown>> {
	await page.ask(`${THEMED}(${JSON.stringify(theme)})`);
	await page.ask(CONTEXT_ON_RAIL);
	await waited(400);
	const asked = await page.ask(`${MENU_PROBE}(${JSON.stringify(BUILT_PARTS)})`);
	await page.ask(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); true`);
	await waited(300);
	return isRecord(asked) ? asked : {};
}

async function builtPage(): Promise<{ readonly page: AskedPage; readonly stop: () => void }> {
	const bundle = await bundleOf("tools/studio-render-page.tsx");
	const sheets = SHEETS.map((at) => readFileSync(path.join(REPO, at), "utf8")).join("\n");
	const html =
		`<!doctype html><html><head><meta charset="utf-8"><style>${sheets}</style></head><body class="theme-light"><div id="root"></div><pre id="boom"></pre><script>localStorage.clear(); window.__MODE__ = "studio";</script><script>__BUNDLE__</script></body></html>`.replace(
			"__BUNDLE__",
			() => bundle,
		);
	const server = http.createServer((_request, response) => {
		response.setHeader("content-type", "text/html");
		response.end(html);
	});
	await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
	const address = server.address();
	const port = typeof address === "object" && address !== null ? address.port : 0;
	const page = await paged(`http://127.0.0.1:${port}/`, "tab menu build", { size: [1800, 1000] });
	await waited(2000);
	await page.reduceMotion();
	await page.ask(OPEN_COLUMN);
	await waited(400);
	return {
		page,
		stop: () => {
			page.close();
			server.close();
		},
	};
}
