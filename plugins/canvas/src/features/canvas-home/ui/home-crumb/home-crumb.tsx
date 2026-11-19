import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { HOME_ICON, HOME_TITLE } from "../../../../shared/lib/canvas-links.js";
import type { HomeShown } from "../../lib/home-shown.js";

export interface HomeCrumbProps {
	readonly shown: HomeShown;
	readonly onAll: () => void;
}

const ICON_PX = 16;

export function HomeCrumb({ shown, onAll }: HomeCrumbProps): ReactElement {
	if (shown === "all") {
		return (
			<span className="sumi-canvas-top-button is-title is-still">
				<Icon name={HOME_ICON} size={ICON_PX} />
				<span>{HOME_TITLE}</span>
			</span>
		);
	}

	return (
		<Fragment>
			<button type="button" className="sumi-canvas-top-button is-home" onClick={onAll}>
				<Icon name={HOME_ICON} size={ICON_PX} />
				<span>{HOME_TITLE}</span>
			</button>
			<span className="sumi-canvas-crumb-slash" aria-hidden="true">
				/
			</span>
			<span className="sumi-canvas-top-button is-title is-still">
				<span>Open in chats</span>
			</span>
		</Fragment>
	);
}
