import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, tooltipMarks } from "@widgetarium/kit";
import type { SendState } from "../../lib/send-state.js";

export interface SendButtonProps {
	readonly state: SendState;
	readonly onSend: () => void;
	readonly onStop: () => void;
}

const SEND = "Send";
const STOP = "Stop";
const ENTER = "↵";
const ESCAPE = "esc";

export function SendButton({ state, onSend, onStop }: SendButtonProps): ReactElement {
	const isStreaming = state === "streaming";
	return (
		<button
			type="button"
			className={`wg-studio-ai-send is-${state}`}
			aria-label={isStreaming ? STOP : SEND}
			aria-disabled={state === "idle"}
			onClick={() => {
				if (isStreaming) {
					onStop();
					return;
				}

				onSend();
			}}
			{...tooltipMarks({ said: isStreaming ? STOP : SEND, keys: isStreaming ? ESCAPE : ENTER, side: "top" })}
		>
			{isStreaming ? (
				<span className="wg-studio-ai-stop-square" aria-hidden={true} />
			) : (
				<Icon name="arrow-up" size={16} />
			)}
		</button>
	);
}
