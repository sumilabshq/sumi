import { colorOf } from "@widgetarium/core/color-math.js";
import type { Rgba } from "@widgetarium/core/color-math.js";
import { inkOn } from "./plate-ink.js";
import type { PlateInk } from "./plate-ink.js";
import type { PlateLook } from "./plate-header-store.js";

const FILL = "--wg-plate-fill";
const STRIP = "--wg-plate-strip";
const INK_TEXT = "var(--sumi-text)";
const INK_CLASSES: Readonly<Record<PlateInk, string>> = {
	dark: "sumi-ink-dark",
	light: "sumi-ink-light",
};

export function wearPlateLook(plate: HTMLElement, head: HTMLElement, look: PlateLook | null): void {
	head.classList.remove(INK_CLASSES.dark, INK_CLASSES.light);

	if (look === null) {
		plate.style.removeProperty(FILL);
		wearStrip(plate, null);
		return;
	}

	plate.style.setProperty(FILL, look.fill);
	wearInk(head, look.fill);
	wearStrip(plate, look.strip);
}

function wearInk(head: HTMLElement, fill: string): void {
	const ink = inkUnder(head, fill);
	if (ink !== null) {
		head.classList.add(INK_CLASSES[ink]);
	}
}

function wearStrip(plate: HTMLElement, strip: string | null): void {
	if (strip === null) {
		plate.style.removeProperty(STRIP);
		delete plate.dataset["plateStrip"];
		return;
	}

	plate.style.setProperty(STRIP, `url("${strip}")`);
	plate.dataset["plateStrip"] = "";
}

function inkUnder(head: HTMLElement, fill: string): PlateInk | null {
	const filled = colourResolvedIn(head, fill, null);
	const dark = colourResolvedIn(head, INK_TEXT, INK_CLASSES.dark);
	const light = colourResolvedIn(head, INK_TEXT, INK_CLASSES.light);

	if (filled === null || dark === null || light === null) {
		console.warn(`[widgetarium] plate ink unread for ${fill}: the fill or an ink token is not a colour`);
		return null;
	}

	return inkOn(filled, { dark, light });
}

function colourResolvedIn(within: HTMLElement, colour: string, inkClass: string | null): Rgba | null {
	const probe = within.ownerDocument.createElement("span");
	probe.style.display = "none";
	probe.style.color = colour;

	if (probe.style.color === "") {
		return null;
	}

	if (inkClass !== null) {
		probe.className = inkClass;
	}

	within.append(probe);
	const resolved = colorOf(getComputedStyle(probe).color);
	probe.remove();
	return resolved;
}
