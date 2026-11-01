import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { RecordAppPageCommand } from "@widgetarium/places";
import { useTogglesMenuOnShown } from "../../../command-menu/lib/use-toggles-menu-on-shown.js";
import { PageCrumb } from "./page-crumb.js";

export interface AppCrumbProps {
	readonly tabId: string;
	readonly appTitle: string;
	readonly pageTitle: string | null;
}

const HOME = "Go to the home of {app}";

export function AppCrumb({ tabId, appTitle, pageTitle }: AppCrumbProps): ReactElement {
	const recordPage = useCommand(RecordAppPageCommand);
	const openMenu = useTogglesMenuOnShown(appTitle, null);
	return (
		<span className="wg-app-crumb" data-plate-crumb="">
			<button
				type="button"
				className="wg-plate-crumb is-pressable"
				aria-label={HOME.replace("{app}", appTitle)}
				data-plate-crumb-app=""
				onClick={() => void recordPage.run({ id: tabId, address: "", how: "push" })}
			>
				<span className="wg-plate-crumb-first">{appTitle}</span>
			</button>
			{pageTitle === null ? null : <PageCrumb title={pageTitle} openMenu={openMenu} />}
		</span>
	);
}
