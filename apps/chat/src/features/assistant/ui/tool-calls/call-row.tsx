import { Fragment, createElement as h } from "react";
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
	return (
		<div className={call.failed ? "wg-studio-ai-call is-failed" : "wg-studio-ai-call"}>
			<CallHead call={call} face={face} canOpen={opened !== null} isOpen={isOpen} onToggle={onToggle} />
			{isOpen && opened ? <div className="wg-studio-ai-call-open">{opened}</div> : null}
		</div>
	);
}

function openedOf(call: AssistantCall, face: CallFace): ReactNode | null {
	if (face.change) {
		return <DiffCard change={face.change} />;
	}

	const shown = JSON.stringify(call.input, null, "\t");

	if (shown === NO_INPUT && call.output === "") {
		return null;
	}

	return (
		<Fragment>
			{shown === NO_INPUT ? null : <CallDetail label={INPUT} said={shown} />}
			{call.output === "" ? null : <CallDetail label={OUTPUT} said={call.output} />}
		</Fragment>
	);
}
