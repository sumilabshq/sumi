import { createElement as h, Fragment } from "react";
import type { ReactElement, ReactNode } from "react";
import { GitPlaceQuery } from "@sumi/git";
import { useOptionalQuery } from "@widgetarium/data-framework";

export interface RepoPlaceGateProps {
	readonly folder: string;
	readonly children: ReactNode;
}

export function RepoPlaceGate({ folder, children }: RepoPlaceGateProps): ReactElement | null {
	const place = useOptionalQuery(GitPlaceQuery, { folder }).data;

	if (place?.kind !== "repo") {
		return null;
	}

	return <Fragment>{children}</Fragment>;
}
