import { createElement as h, Fragment } from "react";
import type { ReactElement, ReactNode } from "react";
import { git } from "@sumi/git";
import { useOptionalQuery } from "@widgetarium/data-framework";

export interface RepoPlaceGateProps {
	readonly folder: string;
	readonly children: ReactNode;
}

export function RepoPlaceGate({ folder, children }: RepoPlaceGateProps): ReactElement | null {
	const place = useOptionalQuery(git.repos.gitPlace, { folder }).data;

	if (place?.kind !== "repo") {
		return null;
	}

	return <Fragment>{children}</Fragment>;
}
