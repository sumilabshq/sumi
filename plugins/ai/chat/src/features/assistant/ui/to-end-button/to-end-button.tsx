import { createElement as h } from "react";
import type { ReactNode } from "react";
import { ListPluginSlot } from "@widgetarium/plugin-framework/react";
import { useChatKey } from "../../../../shared/lib/chat-key-context.js";
import { Button, Icon, tooltipMarks, useMessageScroller, useMessageScrollerScrollable } from "@widgetarium/kit";

const TO_END = "Scroll to the latest message";
const ARROW_PX = 16;

export function ToEndButton(): ReactNode {
	const chatId = useChatKey();
	const { end } = useMessageScrollerScrollable();
	const { scrollToEnd } = useMessageScroller();

	if (!end) {
		return null;
	}

	return (
		<div className="wg-studio-ai-to-end">
			<Button
				variant="lifted"
				form="round"
				className="wg-studio-ai-to-end-button"
				aria-label={TO_END}
				onClick={() => scrollToEnd()}
				{...tooltipMarks({ said: TO_END })}
			>
				<Icon name="arrow-down" size={ARROW_PX} />
				<span className="wg-studio-ai-to-end-label">
					{chatId === null ? null : <ListPluginSlot name="chat.to-end-label" props={{ chatId }} />}
				</span>
			</Button>
		</div>
	);
}
