import type { ClassStyle } from "./class-style.js";
import { parsedClassWords, warnUnsupported } from "./class-words.js";
import type { ComputedStyles } from "./computed-styles.js";
import type { ProbedElement } from "./cascade-probe.js";
import { classNameOf, isGroupHolder, readsGroup, wordsOfElement } from "./element-words.js";
import type { WordHolder } from "./element-words.js";
import { SHAPE_HOLDERS } from "./html-tags.js";
import { inlineStyleOf } from "./inline-style.js";
import { probedAttributesOf } from "./probed-attributes.js";

const STAND_IN_TAG = "div";

export function styleOfElement(node: WordHolder, styles: ComputedStyles | null): ClassStyle {
	const parsed = parsedClassWords(wordsOfElement(node));
	const inline = inlineStyleOf(node.props["style"]);
	if (parsed.unknown.length === 0 && inline === null) return parsed.style;
	if (isInsideShape(node)) return parsed.style;
	if (!styles) {
		warnUnsupported(parsed.unknown);
		return parsed.style;
	}
	return styles.styleOf(parsed.style, probedOf(node, groupAbove(node)));
}

function probedOf(node: WordHolder, group: WordHolder | null): ProbedElement {
	return {
		tag: probedTagOf(node.type),
		className: classNameOf(node.props),
		inline: inlineStyleOf(node.props["style"]),
		attributes: probedAttributesOf(node.props),
		group: group ? probedOf(group, null) : null,
	};
}

function groupAbove(node: WordHolder): WordHolder | null {
	if (!readsGroup(node.props)) return null;
	for (let holder = node.parent; holder; holder = holder.parent) if (isGroupHolder(holder.props)) return holder;
	return null;
}

function isInsideShape(node: WordHolder): boolean {
	return node.parent !== null && SHAPE_HOLDERS.has(node.parent.type);
}

function probedTagOf(type: string): string {
	return type === type.toLowerCase() ? type : STAND_IN_TAG;
}
