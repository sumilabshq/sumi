import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Badge } from "@widgetarium/kit";

export interface UnlistedChipProps {
	readonly unlisted: ReactNode;
}

export function UnlistedChip({ unlisted }: UnlistedChipProps): ReactElement {
	return <Badge variant="chip">{unlisted}</Badge>;
}
