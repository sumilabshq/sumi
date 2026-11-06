import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { IconButton, tooltipMarks } from "@widgetarium/kit";

export interface InertButtonProps {
	readonly label: string;
	readonly className: string;
	readonly children: ReactNode;
}

export function InertButton({ label, className, children }: InertButtonProps): ReactElement {
	return (
		<IconButton
			variant="ghost"
			className={className}
			label={label}
			aria-disabled="true"
			data-ws-inert=""
			{...tooltipMarks({ said: label, side: "bottom" })}
		>
			{children}
		</IconButton>
	);
}
