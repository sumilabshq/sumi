import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SCROLL_BUTTON_LABELS, SCROLL_DIRECTION_WORD } from "../constants/message-scroller";
import type { ScrollDirection } from "../constants/message-scroller";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import type { ScrollEngine } from "../utils/message-scroll-engine";
import { wornWord } from "../utils/surface";
import { Button } from "./button";
import type { SquareButtonProps } from "./button";
import { useMessageScrollerState } from "./message-scroller-context";

export interface MessageScrollerButtonProps extends SquareButtonProps {
	readonly direction?: ScrollDirection | undefined;
	readonly behavior?: ScrollBehavior | undefined;
}

interface EdgeJump {
	readonly engine: ScrollEngine;
	readonly toward: ScrollDirection;
	readonly behavior: ScrollBehavior;
	readonly onClick: SquareButtonProps["onClick"];
}

export function MessageScrollerButton(props: MessageScrollerButtonProps): ReactElement {
	const { direction, behavior = "smooth", label, onClick, className, children, ...rest } = props;
	const { engine, report } = useMessageScrollerState();
	const toward = wornWord(direction, SCROLL_DIRECTION_WORD);
	return (
		<Button
			shape="square"
			emphasis="raised"
			data-slot="message-scroller-button"
			data-direction={toward}
			data-active={String(report[toward])}
			inert={!report[toward]}
			label={label ?? SCROLL_BUTTON_LABELS[toward]}
			{...rest}
			className={cn("wg-kit-scroller-button", className)}
			onClick={edgeJumpHandlerOf({ engine, toward, behavior, onClick })}
		>
			{children ?? <Icon name={toward === "end" ? "arrow-down" : "arrow-up"} />}
		</Button>
	);
}

function edgeJumpHandlerOf({ engine, toward, behavior, onClick }: EdgeJump): SquareButtonProps["onClick"] {
	return (event) => {
		onClick?.(event);
		if (event.defaultPrevented) return;
		if (toward === "end") engine.scrollToEnd({ behavior });
		else engine.scrollToStart({ behavior });
	};
}
