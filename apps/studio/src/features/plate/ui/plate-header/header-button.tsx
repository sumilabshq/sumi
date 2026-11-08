import { createElement as h, forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Icon, IconButton, tooltipMarks } from "@widgetarium/kit";

export interface HeaderButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly label: string;
	readonly icon: string;
	readonly keys?: string;
	readonly isOff?: boolean;
	readonly isInert?: boolean;
	readonly isBusy?: boolean;
	readonly href?: string;
}

export const HeaderButton = forwardRef<HTMLButtonElement, HeaderButtonProps>(function HeaderButton(
	{ label, icon, keys, isOff = false, isInert = false, isBusy = false, href, ...pressed },
	ref,
) {
	return (
		<IconButton
			ref={ref}
			asChild={href !== undefined}
			variant="ghost"
			size="xs"
			className="wg-plate-button"
			label={label}
			{...tooltipMarks({
				said: label,
				keys: keys ?? null,
			})}
			aria-disabled={isOff || isInert ? true : undefined}
			data-off={isOff ? "" : undefined}
			isLoading={isBusy}
			{...pressed}
		>
			{href === undefined ? (
				<Icon name={icon} size={16} />
			) : (
				<a href={href}>
					<Icon name={icon} size={16} />
				</a>
			)}
		</IconButton>
	);
});
