import { foldedString, isStringBuilt } from "./folded-string.js";
import { refusalAt } from "./reach-finding.js";
import { REFUSED_PROPERTIES, TIMERS_TAKING_TEXT, WEBVIEW_SELECTOR } from "./reach-names.js";
import { childOf, childrenOf, lineOf } from "./source-tree-node.js";
import type { Found } from "./reach-finding.js";
import type { SourceTreeNode } from "./source-tree-node.js";

const PROPERTY_READERS: readonly string[] = [
	"get",
	"has",
	"set",
	"getOwnPropertyDescriptor",
	"defineProperty",
	"__lookupGetter__",
	"__lookupSetter__",
];
const SELECTOR_READERS: readonly string[] = [
	"querySelector",
	"querySelectorAll",
	"closest",
	"matches",
	"getElementsByTagName",
];

export function callFindings(call: SourceTreeNode): Found[] {
	return [...textTimerFindings(call), ...namedArgumentFindings(call)];
}

function textTimerFindings(call: SourceTreeNode): Found[] {
	const name = childOf(call, "callee")?.["name"];
	const first = childrenOf(call, "arguments")[0] ?? null;
	if (typeof name !== "string" || !TIMERS_TAKING_TEXT.includes(name) || !isStringBuilt(first)) {
		return [];
	}

	return [
		refusalAt({
			line: lineOf(call),
			token: `${name}(text)`,
			rule: "text-as-code",
			kind: "text-as-code",
		}),
	];
}

function namedArgumentFindings(call: SourceTreeNode): Found[] {
	const method = calledMethodOf(call);
	const texts = childrenOf(call, "arguments").flatMap((argument) => {
		const text = foldedString(argument);
		return text === null ? [] : [{ text, line: lineOf(argument) }];
	});
	if (SELECTOR_READERS.includes(method)) {
		return texts
			.filter(({ text }) => WEBVIEW_SELECTOR.test(text))
			.map(({ text, line }) =>
				refusalAt({
					line,
					token: JSON.stringify(text),
					rule: "webview",
					kind: "webview",
				}),
			);
	}

	if (!PROPERTY_READERS.includes(method)) {
		return [];
	}

	return texts.flatMap(({ text, line }) => {
		const kind = REFUSED_PROPERTIES.get(text);
		return kind === undefined ? [] : [refusalAt({ line, token: JSON.stringify(text), rule: "property", kind })];
	});
}

function calledMethodOf(call: SourceTreeNode): string {
	const callee = childOf(call, "callee");
	const name = childOf(callee ?? call, "property")?.["name"];
	return callee !== null && callee["computed"] !== true && typeof name === "string" ? name : "";
}
