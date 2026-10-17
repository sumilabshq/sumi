import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { CallFace } from "@widgetarium/core/engine/assistant-port.js";

export function CallName({ face }: { readonly face: CallFace }): ReactElement {
	const object = face.isCodeObject
		? h("code", { className: "wg-studio-ai-code", key: "object" }, face.object)
		: face.object;
	return h("span", { className: "wg-studio-ai-call-name" }, face.verb === "" ? object : [`${face.verb} `, object]);
}
