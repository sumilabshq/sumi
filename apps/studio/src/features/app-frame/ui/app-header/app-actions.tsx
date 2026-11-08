import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { apps } from "@sumi/apps";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { HeaderButton } from "../../../plate/ui/plate-header/header-button.js";

export interface AppActionsProps {
	readonly tabId: string;
}

export function AppActions({ tabId }: AppActionsProps): ReactElement {
	const actions = useOptionalQuery(apps.pages.appPage, { id: tabId }).data?.actions ?? [];
	const press = useCommand(apps.pages.pressAppAction);
	return (
		<Fragment>
			{actions.map(({ id, label, icon, isOff = false, isBusy }) => (
				<HeaderButton
					key={id}
					label={label}
					icon={icon}
					isOff={isOff}
					isBusy={isBusy === true}
					data-app-action={id}
					onClick={() => !isOff && void press.run({ tab: tabId, action: id })}
				/>
			))}
		</Fragment>
	);
}
