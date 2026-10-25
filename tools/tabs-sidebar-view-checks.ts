import { writeFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TabArt } from "../apps/studio/src/features/app-host/ui/tab-face/tab-art.tsx";
import path from "node:path";
import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { SETTLED_MS, check, pressOn } from "./tabs-sidebar-check-kit.ts";

const VIEW_OPTIONS = '[data-tabs-section="workspace"] [data-tabs-view-options]';
const HIDE_APART = "[data-tabs-hide-own-window]";
const HIDE_EMPTY = "[data-tabs-hide-empty]";
const OPTIONS_SAID = `[...document.querySelectorAll('[role="menuitemcheckbox"]')].map((item) => item.textContent.trim() + ":" + item.getAttribute("aria-checked"))`;

async function optionsSaid(page: AskedPage): Promise<string> {
	await pressOn(page, VIEW_OPTIONS);
	await waited(SETTLED_MS);
	return JSON.stringify(await page.ask(OPTIONS_SAID));
}

async function toggledApart(page: AskedPage): Promise<void> {
	await pressOn(page, HIDE_APART);
	await waited(SETTLED_MS);
}

const GLOBE = renderToStaticMarkup(
	h(TabArt, {
		icon: "browser",
		favicon: null,
		title: "Browser",
		address: null,
		size: "row",
	}),
).replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
const GLOBE_LINE_ON_RED = `(async () => {
	const picture = new Image();
	picture.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(${JSON.stringify(GLOBE)}.replace(/width="18" height="18"/, 'width="200" height="200"'));
	await picture.decode();
	const canvas = document.createElement("canvas");
	canvas.width = 200;
	canvas.height = 200;
	const paint = canvas.getContext("2d");
	paint.fillStyle = "rgb(255, 0, 0)";
	paint.fillRect(0, 0, 200, 200);
	paint.drawImage(picture, 0, 0, 200, 200);
	return [...paint.getImageData(100, 100, 1, 1).data.slice(0, 3)];
})()`;

export async function checksArtCutOut(page: AskedPage): Promise<void> {
	const pixel = await page.ask(GLOBE_LINE_ON_RED);
	const isRed = Array.isArray(pixel) && pixel[0] === 255 && pixel[1] === 0 && pixel[2] === 0;
	check("the globe's lines are holes, so any background shows through them", isRed, pixel);
}

export async function checksViewOptions(page: AskedPage, folder: string): Promise<void> {
	const first = await optionsSaid(page);
	writeFileSync(path.join(folder, "view-options.png"), await page.shoot());
	check(
		"View options offers both sidebar options, off at first",
		first === '["Hide empty sections:false","Hide tabs in other windows:false"]',
		first,
	);
	await toggledApart(page);
	const switched = await optionsSaid(page);
	check(
		"a press on Hide tabs in other windows switches it on and keeps it",
		switched === '["Hide empty sections:false","Hide tabs in other windows:true"]',
		switched,
	);
	await pressOn(page, HIDE_EMPTY);
	await waited(SETTLED_MS);
	const both = await optionsSaid(page);
	check(
		"switching on Hide empty sections leaves Hide tabs in other windows on",
		both === '["Hide empty sections:true","Hide tabs in other windows:true"]',
		both,
	);
	await pressOn(page, HIDE_EMPTY);
	await waited(SETTLED_MS);
	await optionsSaid(page);
	await toggledApart(page);
}
