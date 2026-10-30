import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TabArt } from "../apps/studio/src/features/app-host/ui/tab-face/tab-art.tsx";
import type { AskedPage } from "./chrome-ask.ts";
import { check } from "./tabs-sidebar-check-kit.ts";

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
