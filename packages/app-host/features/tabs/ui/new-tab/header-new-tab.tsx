import { createElement as h } from "react";
import type { ReactElement } from "react";
import { RoundButton } from "@widgetarium/canvas";
import { Icon } from "@widgetarium/kit";
import { ADD_APP_LEAVES } from "../../../../shared/lib/host-bar-steps/host-bar-steps.js";
import { NewTabMenu } from "./new-tab-menu.js";

const NEW_TAB = "New tab";
const HOLDER = `cv:flex ${ADD_APP_LEAVES}`;

export function HeaderNewTab(): ReactElement {
	const trigger = (
		<RoundButton label={NEW_TAB} tone="raise" size="l" data-host-add="">
			<Icon name="plus" size={18} />
		</RoundButton>
	);
	return (
		<span className={HOLDER}>
			<NewTabMenu trigger={trigger} placement="below" />
		</span>
	);
}
