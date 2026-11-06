import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { MENU_DOOR_MARK } from "../../../command-menu/lib/menu-door-mark.js";

export interface PageCrumbProps {
	readonly title: string;
	readonly openMenu: () => void;
}

export const TYPE_ADDRESS_LABEL = "Type an address";

export function PageCrumb({ title, openMenu }: PageCrumbProps): ReactElement {
	return (
		<Fragment>
			<span className="wg-plate-crumb-slash">/</span>
			<button
				type="button"
				className="wg-plate-crumb is-pressable"
				aria-label={TYPE_ADDRESS_LABEL}
				data-plate-crumb-page=""
				{...MENU_DOOR_MARK}
				onClick={openMenu}
			>
				<span className="wg-plate-crumb-second">{title}</span>
			</button>
		</Fragment>
	);
}
