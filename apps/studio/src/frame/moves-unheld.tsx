import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { HeaderButton } from "../features/plate/ui/plate-header/header-button.js";

export function MovesUnheld(): ReactElement {
	return (
		<Fragment>
			<HeaderButton label="Back" icon="chevron-left" isOff />
			<HeaderButton label="Forward" icon="chevron-right" isOff />
		</Fragment>
	);
}
