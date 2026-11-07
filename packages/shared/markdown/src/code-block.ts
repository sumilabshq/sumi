import { SCROLL_KEEP_ATTRIBUTE } from "@widgetarium/kit";
import { highlightCode } from "./code-highlight.js";
import { languageOf } from "./code-languages.js";
import type { CodeLanguage } from "./code-languages.js";
import { CODE_WRAP_TOGGLE_ATTRIBUTE, applySavedCodeWrap, syncCodeWrapToggle, toggleCodeWrap } from "./code-wrap.js";
import { createCopyTool, createTool } from "./copy-tool.js";
import { createMoreToggle } from "./more-toggle.js";
import type { MarkdownLook } from "./markdown-look.js";

export interface CodeBlockAsk {
	readonly info: string;
	readonly body: string;
	readonly look: MarkdownLook;
}

export const RUN_COMMAND_EVENT = "wg-run-command";

const CUT_OVER_LINES = 50;
const LINES_WHEN_CUT = 24;
const RUNNABLE_LANGUAGE = "bash";
const RUN_SAID = "Ask to run it";
const MORE_LINES = "Show {count} more lines";

export function createCodeBlock(page: Document, { info, body, look }: CodeBlockAsk): Element {
	applySavedCodeWrap(page);
	const label = info.split(/\s+/)[0] ?? "";
	const language = languageOf(label);
	const block = page.createElement("div");
	block.className = "wg-studio-ai-codeblock";
	block.append(createCodeTools(page, { info: label, body, look }), createCodePre(page, body, language));

	if (look.cutsLong) {
		appendCutToggle(page, block, body);
	}

	return block;
}

function createCodePre(page: Document, body: string, language: CodeLanguage | null): Element {
	const pre = page.createElement("pre");
	const code = pre.appendChild(page.createElement("code"));
	code.textContent = body;

	if (language !== null) {
		highlightCode(code, body, language);
	}

	return pre;
}

function appendCutToggle(page: Document, block: HTMLElement, body: string): void {
	const lineCount = body.split("\n").length;

	if (lineCount <= CUT_OVER_LINES) {
		return;
	}

	block.style.setProperty("--wg-code-lines-when-cut", String(LINES_WHEN_CUT));
	block.append(
		createMoreToggle(page, {
			target: block,
			moreSaid: MORE_LINES.replace("{count}", String(lineCount - LINES_WHEN_CUT)),
		}),
	);
}

function createCodeTools(page: Document, { info: label, body, look }: CodeBlockAsk): Element {
	const tools = page.createElement("div");
	tools.className = "wg-studio-ai-codeblock-tools";

	if (label !== "") {
		const name = tools.appendChild(page.createElement("span"));
		name.className = "wg-studio-ai-codeblock-lang";
		name.textContent = label;
	}

	if (look.runsCode && languageOf(label) === RUNNABLE_LANGUAGE) {
		tools.append(createRunTool(page, body));
	}

	tools.append(createWrapTool(page), createCopyTool(page, body));
	return tools;
}

function createRunTool(page: Document, body: string): HTMLButtonElement {
	return createTool(page, {
		said: RUN_SAID,
		glyph: "play",
		onPress: (run) =>
			run.dispatchEvent(
				new CustomEvent(RUN_COMMAND_EVENT, {
					bubbles: true,
					detail: body,
				}),
			),
	});
}

function createWrapTool(page: Document): HTMLButtonElement {
	const wrap = createTool(page, {
		said: "",
		glyph: "text-wrap",
		onPress: () => toggleCodeWrap(page),
	});
	wrap.setAttribute(CODE_WRAP_TOGGLE_ATTRIBUTE, "");
	wrap.setAttribute(SCROLL_KEEP_ATTRIBUTE, "");
	syncCodeWrapToggle(page, wrap);
	return wrap;
}
