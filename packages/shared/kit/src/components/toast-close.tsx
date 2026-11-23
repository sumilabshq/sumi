import { createElement as h } from "react";
import type { ReactElement } from "react";
import { TOAST_QUEUE } from "../utils/toast-queue";
import type { ToastId } from "../utils/toast-queue";
import { Button } from "./button";

export interface ToastCloseProps {
	readonly id: ToastId;
}

const CLOSE_LABEL = "Close";

export function ToastClose({ id }: ToastCloseProps): ReactElement {
	return (
		<Button
			shape="square"
			emphasis="ghost"
			size="sm"
			icon="x"
			label={CLOSE_LABEL}
			className="wg-kit-toast-close"
			onClick={() => TOAST_QUEUE.dismiss(id)}
		/>
	);
}
