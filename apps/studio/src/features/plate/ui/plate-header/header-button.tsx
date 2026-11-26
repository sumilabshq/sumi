import { createElement as h, forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Button, Icon, tooltipMarks } from "@widgetarium/kit";

export interface HeaderButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "form"> {
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
		<Button
			shape="square"
			ref={ref}
			asChild={href !== undefined}
			emphasis="ghost"
			size="sm"
			className="wg-plate-button"
			label={label}
			{...tooltipMarks({
				said: label,
				keys: keys ?? null,
			})}
			aria-disabled={isOff || isInert ? true : undefined}
			isLoading={isBusy}
			{...pressed}
		>
			{href === undefined ? (
				<Icon name={icon} size="fit" />
			) : (
				<a href={href}>
					<Icon name={icon} size="fit" />
				</a>
			)}
		</Button>
	);
});
