import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import type { StudioApp } from "../../shared/studio-app.js";

export interface MenuTriggerProps {
	readonly app: StudioApp | null;
	readonly isOpen: boolean;
}

const UNREAD_LABEL = "Workspace menu";

export function MenuTrigger({ app, isOpen }: MenuTriggerProps): ReactElement {
	return (
		<Button
			variant={isOpen ? "secondary" : "ghost"}
			size="icon-sm"
			className="wg-studio-menu-trigger"
			aria-label={app ? `${app.name} menu` : UNREAD_LABEL}
		>
			<Icon name="ellipsis" />
		</Button>
	);
}
