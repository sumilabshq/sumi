import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { RoundButton, Tip } from "@widgetarium/canvas";
import { ADD_APP_LEAVES } from "../../lib/host-bar-steps/host-bar-steps.js";

const ADD_APP = "Add an app";
const MORE_APPS_SOON = "More apps soon";
const ADD_APP_HOLDER = `cv:flex ${ADD_APP_LEAVES}`;

// TODO: opens the apps catalogue once there is one
export function AddAppButton(): ReactElement {
	return (
		<span className={ADD_APP_HOLDER}>
			<Tip label={MORE_APPS_SOON}>
				<RoundButton label={ADD_APP} tone="raise" size="l" aria-disabled="true" data-host-add="">
					<Icon name="plus" size={18} />
				</RoundButton>
			</Tip>
		</span>
	);
}
