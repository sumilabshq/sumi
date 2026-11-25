import { createElement as h } from "react";
import type { HTMLAttributes, KeyboardEvent, ReactElement } from "react";
import { cn } from "../utils/cn";
import { DISMISSED_BY_ESCAPE, ModalLayer } from "./modal-layer";

export interface AlertDialogContentProps extends HTMLAttributes<HTMLDivElement> {
	readonly size?: "default" | "sm" | undefined;
}

const ACTION = '[data-slot="alert-dialog-action"]';

function confirmsOnEnter(event: KeyboardEvent<HTMLDivElement>): void {
	if (event.defaultPrevented || event.key !== "Enter" || event.nativeEvent.isComposing) {
		return;
	}

	const action = event.currentTarget.querySelector<HTMLButtonElement>(ACTION);

	if (!action || action.disabled) {
		return;
	}

	event.preventDefault();
	action.click();
}

export function AlertDialogContent({ size = "default", className, onKeyDown, ...rest }: AlertDialogContentProps): ReactElement {
	return (
		<ModalLayer
			kind="alert-dialog"
			dismissal={DISMISSED_BY_ESCAPE}
			data-size={size}
			{...rest}
			onKeyDown={(event) => {
				onKeyDown?.(event);
				confirmsOnEnter(event);
			}}
			className={cn(size === "sm" && "is-sm", className)}
		/>
	);
}
