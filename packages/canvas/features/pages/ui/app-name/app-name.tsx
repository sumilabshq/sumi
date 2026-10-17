import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { AppNameQuery } from "../../contract.js";

export function AppName(): ReactElement {
	return <b>{useQuery(AppNameQuery).data.app}</b>;
}
