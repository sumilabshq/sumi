import { createElement as h, Fragment } from "react";
import type { ReactElement, ReactNode } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { TabsColumnQuery } from "../../contract.js";

export function WhileColumnHidden({ children }: { readonly children: ReactNode }): ReactElement | null {
	const { look } = useQuery(TabsColumnQuery).data;
	return look === "hidden" ? <Fragment>{children}</Fragment> : null;
}
