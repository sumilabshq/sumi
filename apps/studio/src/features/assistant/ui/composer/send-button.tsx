import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, Tooltip, TooltipContent, TooltipTrigger } from "@widgetarium/kit";
import type { SendState } from "../../lib/send-state.js";

export interface SendButtonProps {
	readonly state: SendState;
	readonly onSend: () => void;
	readonly onStop: () => void;
}

const SEND = "Send";
const STOP = "Stop";
const ENTER = "⏎";

export function SendButton({ state, onSend, onStop }: SendButtonProps): ReactElement {
	const isStreaming = state === "streaming";
	return (
		<Tooltip>
			<TooltipTrigger
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
			>
				<Icon name={isStreaming ? "square" : "arrow-up"} size={18} />
			</TooltipTrigger>
			<TooltipContent side="top" align="end" className="wg-studio-ai-tip">
				{isStreaming ? STOP : SEND}
				{isStreaming ? null : <kbd>{ENTER}</kbd>}
			</TooltipContent>
		</Tooltip>
	);
}
