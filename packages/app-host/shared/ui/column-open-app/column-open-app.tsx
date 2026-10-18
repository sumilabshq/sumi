import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { AppPicker } from "../../../features/app-picker/ui/app-picker/app-picker.js";
import { OpenTabCommand } from "../../../features/tabs/contract.js";
import { ColumnFootRow } from "../column-foot/column-foot-row.js";

export const OPEN_APP = "Open app";
export const APPS_ICON = "layout-grid";

export function ColumnOpenApp(): ReactElement {
	const openTab = useCommand(OpenTabCommand);
	const trigger = <ColumnFootRow icon={APPS_ICON} label={OPEN_APP} hint={null} data-host-column-open-app="" />;
	return <AppPicker trigger={trigger} onAdd={(app) => void openTab.run({ app })} />;
}
