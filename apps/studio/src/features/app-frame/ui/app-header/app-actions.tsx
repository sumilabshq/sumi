import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { PressAppActionCommand } from "@widgetarium/places";
import type { AppAction } from "@widgetarium/places";
import { HeaderButton } from "../../../plate/ui/plate-header/header-button.js";

export interface AppActionsProps {
	readonly tabId: string;
	readonly actions: readonly AppAction[];
}

export function AppActions({ tabId, actions }: AppActionsProps): ReactElement {
	const press = useCommand(PressAppActionCommand);
	return (
		<Fragment>
			{actions.map(({ id, label, icon, isOff = false, isBusy }) => (
				<HeaderButton
					key={id}
					label={label}
					icon={icon}
					isOff={isOff}
					aria-busy={isBusy || undefined}
					data-app-action={id}
					onClick={() => !isOff && void press.run({ tab: tabId, action: id })}
				/>
			))}
		</Fragment>
	);
}
