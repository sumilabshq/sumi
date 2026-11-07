import { highlightedLinesOf } from "./code-highlight.js";
import { languageOf } from "./code-languages.js";

export interface CodeLinesAsk {
	readonly body: string;
	readonly language: string;
	readonly wraps: boolean;
}

const LINES = "sumi-code-lines";
const LINE = "sumi-code-line";
const NUMBER = "sumi-code-number";
const SAID = "sumi-code-said";
const WRAPPED = "is-wrapped";
const SHEET_ID = "sumi-code-lines-sheet";
const SHEET = `
.${LINES} { box-sizing: border-box; min-width: max-content; padding: 4px 0 12px; color: var(--sumi-code-foreground, var(--sumi-text)); font: 400 12.5px / 22px var(--sumi-font-mono); tab-size: 4; }
.${LINES}.${WRAPPED} { min-width: 0; }
.${LINE} { display: flex; min-height: 22px; }
.${NUMBER} { flex: none; width: 44px; box-sizing: border-box; padding-right: 10px; margin-right: 17px; text-align: right; color: var(--sumi-text-3); font-size: 11.5px; -webkit-user-select: none; user-select: none; }
.${SAID} { flex: 1; min-width: 0; padding-right: 16px; white-space: pre; }
.${WRAPPED} .${SAID} { white-space: pre-wrap; overflow-wrap: anywhere; }
`;
const HIGHLIGHT_FAILED = "[markdown] {language} lines stayed plain, highlighting failed";

export function createCodeLines(page: Document, { body, language, wraps }: CodeLinesAsk): HTMLElement {
	laySheet(page);
	const lines = page.createElement("div");
	lines.className = wraps ? `${LINES} ${WRAPPED}` : LINES;
	const saids = body.split("\n").map((text, at) => appendLine(lines, text, at + 1));
	highlightSaids(page, saids, { body, language, wraps });
	return lines;
}

function appendLine(lines: HTMLElement, text: string, number: number): HTMLElement {
	const page = lines.ownerDocument;
	const line = lines.appendChild(page.createElement("div"));
	line.className = LINE;
	const numbered = line.appendChild(page.createElement("span"));
	numbered.className = NUMBER;
	numbered.textContent = String(number);
	const said = line.appendChild(page.createElement("span"));
	said.className = SAID;
	said.textContent = text;
	return said;
}

function highlightSaids(page: Document, saids: readonly HTMLElement[], { body, language }: CodeLinesAsk): void {
	const known = languageOf(language);

	if (known === null) {
		return;
	}

	highlightedLinesOf(page, body, known).then(
		(lines) => lines.forEach((nodes, at) => saids[at]?.replaceChildren(...nodes)),
		(error: unknown) => console.error(HIGHLIGHT_FAILED.replace("{language}", language), error),
	);
}

function laySheet(page: Document): void {
	const sheet = page.getElementById(SHEET_ID) ?? page.head.appendChild(page.createElement("style"));
	sheet.id = SHEET_ID;

	if (sheet.textContent !== SHEET) {
		sheet.textContent = SHEET;
	}
}
