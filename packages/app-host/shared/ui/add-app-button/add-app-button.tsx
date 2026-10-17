import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { RoundButton, Tip } from "@widgetarium/canvas";

const ADD_APP = "Add an app";
const MORE_APPS_SOON = "More apps soon";

// TODO: opens the apps catalogue once there is one
export function AddAppButton(): ReactElement {
	return (
		<Tip label={MORE_APPS_SOON}>
			<RoundButton label={ADD_APP} tone="raise" size="l" aria-disabled="true" data-host-add="">
				<Icon name="plus" size={18} />
			</RoundButton>
		</Tip>
	);
}
