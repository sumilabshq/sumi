import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@widgetarium/framework";
import { portalLayer } from "@widgetarium/kit";
import { CommandMenuQuery } from "@widgetarium/command-menu";
import { OpenMenu } from "./open-menu.js";

export function CommandMenu(): ReactElement | null {
	const menu = useQuery(CommandMenuQuery).data;

	if (!menu.isOpen) {
		return null;
	}

	return createPortal(<OpenMenu menu={menu} />, portalLayer());
}
