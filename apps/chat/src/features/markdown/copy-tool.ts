import { tooltipMarks } from "@widgetarium/kit";
import { createGlyph } from "./glyph.js";
import type { GlyphName } from "./glyph.js";

export interface ToolAsk {
	readonly said: string;
	readonly glyph: GlyphName;
	readonly onPress: (tool: HTMLButtonElement) => void;
}

const COPIED_MS = 1500;
const COPY_SAID = "Copy";

export function createCopyTool(page: Document, body: string): HTMLButtonElement {
	return createTool(page, {
		said: COPY_SAID,
		glyph: "copy",
		onPress: (copy) => copyText(page, body, copy),
	});
}

export function createTool(page: Document, { said, glyph, onPress }: ToolAsk): HTMLButtonElement {
	const tool = page.createElement("button");
	tool.type = "button";
	tool.className = "wg-studio-ai-codeblock-tool";
	tool.setAttribute("aria-label", said);

	for (const [attribute, value] of Object.entries(tooltipMarks({ said }))) {
		if (value !== undefined) {
			tool.setAttribute(attribute, value);
		}
	}

	tool.append(createGlyph(page, glyph));
	tool.addEventListener("click", () => onPress(tool));
	return tool;
}

function copyText(page: Document, body: string, copy: HTMLButtonElement): void {
	const clipboard = page.defaultView?.navigator.clipboard;

	if (!clipboard) {
		console.error("[sumi-chat] nothing was copied: this window has no clipboard");
		return;
	}

	clipboard.writeText(body).then(
		() => showCopied(page, copy),
		(error: unknown) => console.error("[sumi-chat] the text was not copied", error),
	);
}

function showCopied(page: Document, copy: HTMLButtonElement): void {
	copy.classList.add("is-copied");
	copy.replaceChildren(createGlyph(page, "check"));
	page.defaultView?.setTimeout(() => {
		copy.classList.remove("is-copied");
		copy.replaceChildren(createGlyph(page, "copy"));
	}, COPIED_MS);
}
