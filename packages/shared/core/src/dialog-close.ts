import { createElement as h, useContext } from "react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { Button, cn, Icon } from "@widgetarium/kit";
import { DialogState } from "./dialog-state.js";

export type DialogCloseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "form" | "onClick"> & {
	readonly className?: string;
	readonly onClose?: () => void;
	readonly label?: string;
};

// TRADE-OFF: the kit's icon button, because a fill on a bare <button> loses its radius to the host
export function DialogClose({ className: cls, onClose, label = "Close", ...rest }: DialogCloseProps): ReactElement {
	const state = useContext(DialogState);
	return h(
		Button,
		{
			shape: "square",
			size: "sm",
			...rest,
			className: cn("wg-dialog-close", cls),
			label,
			title: label,
			onClick: onClose ?? state?.close,
		},
		h(Icon, { name: "close" }),
	);
}
