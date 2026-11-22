import type { ViewPart } from "@sumi/view-work/implementation";
import { highlightedLinesOf, languageOf } from "@widgetarium/markdown";

const CODE_GUIDE = `Code inside a view: <pre data-language="ts">the code</pre>. Sumi colours it like the chat's code and sets it in the mono font, with no box around it. Use it only when code is one piece of a bigger view, a cheatsheet or an API answer; code alone goes in your text as a code block.`;

const CODE_SHEET = `
pre.code { margin: 0; overflow-x: auto; color: var(--code-foreground, var(--text)); font-size: var(--fs-13); line-height: 1.6; white-space: pre; tab-size: 4; }
`;

const LANGUAGED = "pre[data-language]";

export const CODE_PART: ViewPart = {
	id: "code",
	guide: CODE_GUIDE,
	css: CODE_SHEET,
	script: "",
	transform: highlightsCodeIn,
};

async function highlightsCodeIn(page: Document): Promise<void> {
	await Promise.all([...page.querySelectorAll(LANGUAGED)].map((pre) => codeBlockFor(page, pre)));
}

async function codeBlockFor(page: Document, pre: Element): Promise<void> {
	const label = pre.getAttribute("data-language")?.trim() ?? "";
	const body = (pre.textContent ?? "").replace(/^\n/, "").replace(/\s+$/, "");
	const coloured = page.createElement("pre");
	coloured.className = "code";
	const code = coloured.appendChild(page.createElement("code"));
	code.textContent = body;
	const language = languageOf(label);

	if (language !== null) {
		const lines = await highlightedLinesOf(page, body, language);
		code.replaceChildren(
			...lines.flatMap((line, at) => (at === lines.length - 1 ? [...line] : [...line, page.createTextNode("\n")])),
		);
	}

	pre.replaceWith(coloured);
}
