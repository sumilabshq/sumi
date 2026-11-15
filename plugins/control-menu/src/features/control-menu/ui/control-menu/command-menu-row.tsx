import { createElement as h } from "react";
import type { ReactNode } from "react";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { Icon } from "@widgetarium/kit";
import { commandMenu } from "@sumi/command-menu/contract";
import { ControlMenuRow } from "../control-menu-row/control-menu-row.js";

const COMMAND_MENU = "Command menu";
const ANYWHERE_DOOR = "anywhere";
const ICON_PX = 16;

export function CommandMenuRow(): ReactNode {
	const openMenu = useCommand(commandMenu.opening.toggle);
	const doors = useOptionalQuery(commandMenu.opening.doors).data?.doors ?? [];
	return (
		<ControlMenuRow
			label={COMMAND_MENU}
			keys={doors.find(({ id }) => id === ANYWHERE_DOOR)?.keys ?? null}
			icon={<Icon name="command" size={ICON_PX} />}
			onRun={() => void openMenu.run({ door: ANYWHERE_DOOR, text: "" })}
		/>
	);
}
