import { createElement as h, Fragment } from "react";
import type { ReactElement, ReactNode } from "react";
import { PopoverSeparator } from "@widgetarium/kit";

export interface MenuSectionProps {
	readonly label: string;
	readonly isShown: boolean;
	readonly hasRule: boolean;
	readonly children: ReactNode;
}

export function MenuSection({ label, isShown, hasRule, children }: MenuSectionProps): ReactElement | null {
	if (!isShown) {
		return null;
	}

	return (
		<Fragment>
			{hasRule ? <PopoverSeparator /> : null}
			<div className="wg-git-mlabel">{label}</div>
			{children}
		</Fragment>
	);
}
