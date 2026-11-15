import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { workspaces } from "@widgetarium/workspaces/contract";

export function ProfileLine(): ReactElement {
	const shown = useOptionalQuery(workspaces.workspaces.all).data;
	return <div className="wg-cm-profile">{shown?.current.name ?? ""}</div>;
}
