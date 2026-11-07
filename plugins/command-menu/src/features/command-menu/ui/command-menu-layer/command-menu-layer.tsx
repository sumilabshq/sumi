import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { CommandMenu } from "../command-menu/command-menu.js";
import { CommandMenuKeys } from "../command-menu-keys/command-menu-keys.js";

export function CommandMenuLayer(): ReactElement {
	return (
		<>
			<CommandMenu />
			<CommandMenuKeys />
		</>
	);
}
