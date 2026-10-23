import { createElement as h, forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Icon, IconButton, tooltipMarks } from "@widgetarium/kit";

export interface HeaderButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly label: string;
	readonly icon: string;
	readonly isOff?: boolean;
	readonly isInert?: boolean;
}

export const HeaderButton = forwardRef<HTMLButtonElement, HeaderButtonProps>(function HeaderButton(
	{ label, icon, isOff = false, isInert = false, ...pressed },
	ref,
) {
	return (
		<IconButton
			ref={ref}
			variant="ghost"
			size="xs"
			className="wg-plate-button"
			label={label}
			{...tooltipMarks({ said: label })}
			aria-disabled={isOff || isInert ? true : undefined}
			data-off={isOff ? "" : undefined}
			{...pressed}
		>
			<Icon name={icon} size={16} />
		</IconButton>
	);
});
