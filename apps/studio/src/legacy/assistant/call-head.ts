import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { CallMetaSaid } from "./call-meta.js";
import { CallName } from "./call-name.js";

export interface CallHeadProps {
	readonly call: AssistantCall;
	readonly face: CallFace;
	readonly canOpen: boolean;
	readonly isOpen: boolean;
	readonly onToggle: () => void;
}

export function CallHead({ call, face, canOpen, isOpen, onToggle }: CallHeadProps): ReactElement {
	const press = {
		className: "wg-studio-ai-call-head",
		type: "button",
		disabled: !canOpen,
		"aria-expanded": canOpen ? isOpen : undefined,
		onClick: onToggle,
	};
	return h("button", press, [
		h("span", { className: callMarkClassOf(call, face), key: "mark" }, h(Icon, { name: face.glyph, size: 16 })),
		h(CallName, { key: "name", face }),
		face.meta ? h(CallMetaSaid, { key: "meta", meta: face.meta }) : null,
	]);
}

function callMarkClassOf(call: AssistantCall, face: CallFace): string {
	return `wg-studio-ai-call-mark is-${call.failed ? "failed" : face.kind}`;
}
