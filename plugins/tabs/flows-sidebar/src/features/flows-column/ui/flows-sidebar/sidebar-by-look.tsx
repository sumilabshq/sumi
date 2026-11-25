import { createElement as h } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { DockedColumn } from "./docked-column.js";
import { HiddenColumn } from "./hidden-column.js";

export function SidebarByLook(): ReactNode {
	const look = useQuery(appHost.frameSides.frameSides).data.left;
	return look === "docked" ? <DockedColumn /> : <HiddenColumn isPeeking={look === "peeking"} />;
}
