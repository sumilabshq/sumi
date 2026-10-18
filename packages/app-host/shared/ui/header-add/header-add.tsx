import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { HeaderAppPicker } from "../../../features/app-picker/ui/header-app-picker/header-app-picker.js";
import { OpenTabCommand } from "../../../features/tabs/contract.js";

export function HeaderAdd(): ReactElement {
	const openTab = useCommand(OpenTabCommand);
	return <HeaderAppPicker onAdd={(app) => void openTab.run({ app })} />;
}
