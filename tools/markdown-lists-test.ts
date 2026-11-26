import { JSDOM } from "jsdom";
import { CHAT_LOOK, markdownNodesOf as sharedNodesOf } from "@widgetarium/markdown";
import { markdownNodesOf as tauriNodesOf } from "../apps/tauri/src/agent/markdown-blocks.ts";
import { check, tally } from "./check-helpers.ts";

type NodesOf = (page: Document, markdown: string) => readonly Node[];

const PARSERS: Readonly<Record<string, NodesOf>> = {
	"the shared markdown": (page, markdown) => sharedNodesOf(page, markdown, CHAT_LOOK),
	"the chat's tauri markdown": (page, markdown) => tauriNodesOf(page, markdown),
};

const LIST = "- first item\n- `pages()` are getters; read through a query like `getPages`.";

function shapeOf(nodesOf: NodesOf, markdown: string): readonly string[] {
	const page = new JSDOM("<div></div>").window.document;
	const holder = page.createElement("div");
	holder.append(...nodesOf(page, markdown));
	return [...holder.children].map((block) => {
		const inside = [...block.querySelectorAll("li")].map((item) =>
			[...item.children].map((child) => child.tagName.toLowerCase()).join("+"),
		);
		return `${tagOf(block)}${block.tagName === "UL" || block.tagName === "OL" ? `[${inside.join(",")}]` : ""}`;
	});
}

function tagOf(block: Element): string {
	return block.tagName === "PRE" || block.tagName === "DIV" ? "code-block" : block.tagName.toLowerCase();
}

for (const [name, nodesOf] of Object.entries(PARSERS)) {
	check(
		`${name}: a rule after a list and a blank line is a sibling of the list`,
		shapeOf(nodesOf, `${LIST}\n\n---\nfooter`),
		["ul[,code+code]", "hr", "p"],
	);
	check(
		`${name}: a quote after a list and a blank line is a sibling of the list`,
		shapeOf(nodesOf, `${LIST}\n\n> note`),
		["ul[,code+code]", "blockquote"],
	);
	check(
		`${name}: a fenced block after a list and a blank line is a sibling of the list`,
		shapeOf(nodesOf, `${LIST}\n\n\`\`\`js\nx\n\`\`\``),
		["ul[,code+code]", "code-block"],
	);
	check(
		`${name}: a paragraph after a list and a blank line is a sibling of the list`,
		shapeOf(nodesOf, `${LIST}\n\ntext`),
		["ul[,code+code]", "p"],
	);
	check(
		`${name}: a block indented to the item's text stays in the item across a blank line`,
		shapeOf(nodesOf, "1. step\n\n   more about it\n2. next"),
		["ol[p,]"],
	);
	check(
		`${name}: a rule indented to the item's text stays in the item`,
		shapeOf(nodesOf, "1. step\n\n   ---\n2. next"),
		["ol[hr,]"],
	);
	check(
		`${name}: a block under the marker only ends the item`,
		shapeOf(nodesOf, "1. step\n\n  text under the marker\n2. next"),
		["ol[]", "p", "ol[]"],
	);
	check(`${name}: a nested list stays in its item`, shapeOf(nodesOf, "1. one\n   - sub\n2. two\n\n---"), [
		"ol[ul,,]",
		"hr",
	]);
}

if (tally.failed > 0) {
	process.exit(1);
}

console.log("markdown lists: all checks passed");
