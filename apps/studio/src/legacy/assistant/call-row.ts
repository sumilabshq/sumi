import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { CallDetail } from "./call-detail.js";
import { CallHead } from "./call-head.js";
import { DiffCard } from "./diff-card.js";

export interface CallRowProps {
	readonly call: AssistantCall;
	readonly face: CallFace;
	readonly isOpen: boolean;
	readonly onToggle: () => void;
}

const INPUT = "Input";
const OUTPUT = "Output";
const NO_INPUT = "{}";

export function CallRow({ call, face, isOpen, onToggle }: CallRowProps): ReactElement {
	const opened = openedOf(call, face);
	return h("div", { className: call.failed ? "wg-studio-ai-call is-failed" : "wg-studio-ai-call" }, [
		h(CallHead, { key: "head", call, face, canOpen: opened !== null, isOpen, onToggle }),
		isOpen && opened ? h("div", { className: "wg-studio-ai-call-open", key: "open" }, opened) : null,
	]);
}

function openedOf(call: AssistantCall, face: CallFace): ReactNode | null {
	if (face.change) {
		return h(DiffCard, { change: face.change });
	}

	const shown = JSON.stringify(call.input, null, "\t");
	if (shown === NO_INPUT && call.output === "") {
		return null;
	}

	return [
		shown === NO_INPUT ? null : h(CallDetail, { key: "in", label: INPUT, said: shown }),
		call.output === "" ? null : h(CallDetail, { key: "out", label: OUTPUT, said: call.output }),
	];
}
