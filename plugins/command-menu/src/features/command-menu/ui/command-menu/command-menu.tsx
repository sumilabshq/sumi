import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@widgetarium/data-framework";
import { portalLayer } from "@widgetarium/kit";
import { commandMenu } from "@sumi/command-menu/contract";
import { OpenMenu } from "./open-menu.js";

export function CommandMenu(): ReactElement | null {
	const menu = useQuery(commandMenu.opening.commandMenu).data;

	if (!menu.isOpen) {
		return null;
	}

	return createPortal(<OpenMenu menu={menu} />, portalLayer());
}
