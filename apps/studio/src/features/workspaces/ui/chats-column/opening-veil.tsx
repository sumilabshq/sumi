import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { WorkspacesQuery } from "@widgetarium/workspaces";

export function OpeningVeil({ children }: { readonly children: ReactNode }): ReactElement {
	const { isOpening } = useQuery(WorkspacesQuery).data;
	return (
		<div className={`wg-ws-body${isOpening ? " is-opening" : ""}`} aria-busy={isOpening}>
			{children}
		</div>
	);
}
