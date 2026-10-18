import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { AppPicker } from "../../../features/app-picker/ui/app-picker/app-picker.js";
import { OpenTabCommand } from "../../../features/tabs/contract.js";
import { RailRoundButton } from "../column-foot/rail-round-button.js";
import { APPS_ICON, OPEN_APP } from "../column-open-app/column-open-app.js";

export function RailOpenApp(): ReactElement {
	const openTab = useCommand(OpenTabCommand);
	const trigger = <RailRoundButton icon={APPS_ICON} label={OPEN_APP} data-host-column-open-app="" />;
	return <AppPicker trigger={trigger} onAdd={(app) => void openTab.run({ app })} />;
}
