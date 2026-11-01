import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, tooltipMarks } from "@widgetarium/kit";
import type { SendState } from "../../lib/send-state.js";

export interface SendButtonProps {
	readonly state: SendState;
	readonly isEditing: boolean;
	readonly onSend: () => void;
	readonly onStop: () => void;
}

const SEND = "Send";
const QUEUE = "Add to the queue";
const SAVE = "Save the queued message";
const STOP = "Stop";
const ENTER = "↵";
const ESCAPE = "esc";

export function SendButton({ state, isEditing, onSend, onStop }: SendButtonProps): ReactElement {
	const isStreaming = state === "streaming" && !isEditing;
	const said = saidOf(state, isEditing);
	return (
		<button
			type="button"
			className={`wg-studio-ai-send is-${state}`}
			aria-label={said}
			aria-disabled={state === "idle"}
			onClick={() => {
				if (isStreaming) {
					onStop();
					return;
				}

				onSend();
			}}
			{...tooltipMarks({ said, keys: isStreaming ? ESCAPE : ENTER, side: "top" })}
		>
			{isStreaming ? <span className="wg-studio-ai-stop-square" aria-hidden={true} /> : <Icon name={isEditing ? "check" : "arrow-up"} size={14} />}
		</button>
	);
}

function saidOf(state: SendState, isEditing: boolean): string {
	if (isEditing) {
		return SAVE;
	}

	if (state === "streaming") {
		return STOP;
	}

	return state === "queueing" ? QUEUE : SEND;
}
