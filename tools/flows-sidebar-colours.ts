import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundledSidebarPage, doubleClickOn, openedSidebar } from "./flows-sidebar-harness.ts";

const OUT = process.argv[2] ?? "/tmp/sumi-picker-shots/v2";
const THEME = process.argv[3] ?? "dark";

const PROBE = `(() => {
	const paintOf = (node) => {
		for (let at = node; at !== null; at = at.parentElement) {
			const colour = getComputedStyle(at).backgroundColor;
			if (colour !== "rgba(0, 0, 0, 0)") return colour + " <- " + (typeof at.className === "string" ? at.className.split(" ").slice(0, 3).join(".") : at.tagName);
		}
		return null;
	};
	const pop = document.querySelector(".wg-kit-pop:has(.sumi-flows-picker)");
	const vars = {};
	const style = getComputedStyle(pop);
	for (const name of ["--frame", "--surface-menu", "--glass-group", "--raise", "--background", "--foreground", "--fill", "--hue", "--neutral-chroma", "--text", "--text-2", "--text-3", "--hover", "--group-plain"]) vars[name] = style.getPropertyValue(name).trim();
	const sample = document.createElement("div");
	sample.className = "wg-kit-pop-search";
	sample.innerHTML = '<label class="wg-kit-field is-s is-block wg-kit-pop-search-field"><input class="wg-kit-field-input"></label>';
	pop.querySelector(".wg-kit-pop-inner").append(sample);
	const sessionsField = paintOf(sample.firstElementChild);
	sample.remove();
	const sidebar = document.querySelector(".sumi-flows-sidebar");
	const glyph = document.querySelector(".sumi-flows-row .sumi-flows-glyph");
	const cell = document.querySelector(".sumi-flows-picker-choice");
	return {
		htmlClass: document.documentElement.className,
		varsOnPopover: vars,
		sidebarPaint: paintOf(sidebar),
		popoverPaint: paintOf(pop),
		pickerTabsPaint: paintOf(document.querySelector(".sumi-flows-picker-tabs")),
		pickerFieldPaint: paintOf(document.querySelector(".sumi-flows-picker-field")),
		sessionsFieldPaint: sessionsField,
		sidebarRowGlyphColour: glyph === null ? null : getComputedStyle(glyph).color,
		pickerCellColour: cell === null ? null : getComputedStyle(cell).color,
	};
})()`;

async function openPicker(page: AskedPage): Promise<void> {
	await doubleClickOn(page, ".sumi-flows-row-main", "Reading list");
	await waited(300);
	const [x, y] = (await page.ask(
		`(() => { const box = document.querySelector(".sumi-flows-field-icon").getBoundingClientRect(); return [box.left + 10, box.top + 10]; })()`,
	)) as [number, number];
	await page.press(x, y);
	await waited(500);
}

mkdirSync(OUT, { recursive: true });
const bundled = await bundledSidebarPage();
const opened = await openedSidebar(bundled, THEME, "inbox");
writeFileSync(path.join(OUT, `plain-${THEME}.png`), await opened.page.shoot());
await openPicker(opened.page);
console.log(JSON.stringify(await opened.page.ask(PROBE), null, 1));
opened.stop();
