import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { Button } from "./button";
import type { ButtonProps } from "./button";

export interface ActionButtonProps extends Omit<ButtonProps, "size" | "variant"> {
	readonly icon?: ReactNode;
	readonly label?: string | undefined;
}

const ACTION_ICON_PX = 16;

const ACTION_SIZE = "s";

export function ActionButton({ icon, label, className: cls, children, ...rest }: ActionButtonProps): ReactElement {
	const isMarked = rest.isLoading || rest.isDone;
	const drawnIcon = isMarked ? null : iconDrawn(icon);
	const className = cn("wg-kit-action", cls);
	if (!children) {
		return <Button {...rest} shape="square" size="sm" className={className} label={label ?? ""} children={drawnIcon} />;
	}

	return (
		<Button {...rest} size={ACTION_SIZE} className={className} aria-label={label}>
			{drawnIcon}
			{children}
		</Button>
	);
}

function iconDrawn(icon: ReactNode): ReactNode {
	return typeof icon === "string" ? <Icon name={icon} size={ACTION_ICON_PX} /> : icon;
}
