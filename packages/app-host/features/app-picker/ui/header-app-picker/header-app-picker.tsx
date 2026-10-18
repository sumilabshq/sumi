import { createElement as h } from "react";
import type { ReactElement } from "react";
import { RoundButton } from "@widgetarium/canvas";
import { Icon } from "@widgetarium/kit";
import { ADD_APP_LEAVES } from "../../../../shared/lib/host-bar-steps/host-bar-steps.js";
import type { AppKind } from "../../../../shared/schema/app-tab.schema.js";
import { AppPicker } from "../app-picker/app-picker.js";

export interface HeaderAppPickerProps {
	readonly onAdd: (app: AppKind) => void;
}

const ADD_APP = "Add an app";
const HOLDER = `cv:flex ${ADD_APP_LEAVES}`;

export function HeaderAppPicker({ onAdd }: HeaderAppPickerProps): ReactElement {
	const trigger = (
		<RoundButton label={ADD_APP} tone="raise" size="l" data-host-add="">
			<Icon name="plus" size={18} />
		</RoundButton>
	);
	return (
		<span className={HOLDER}>
			<AppPicker trigger={trigger} onAdd={onAdd} />
		</span>
	);
}
