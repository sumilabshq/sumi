import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SplitMap } from "@widgetarium/app-host";
import { SplitMapIcon } from "../split-map/split-map-icon.js";
import { PinnedMark } from "./pinned-mark.js";

export type RowBadge = { readonly kind: "pinned" } | { readonly kind: "split-map"; readonly map: SplitMap };

const IN_SPLIT = "Open in a split view";
const MAP = "cv:ms-auto cv:flex cv:flex-none";

export function RowBadgeMark({ badge }: { readonly badge: RowBadge }): ReactElement {
	if (badge.kind === "pinned") {
		return <PinnedMark />;
	}

	return (
		<span className={MAP} data-split-badge="">
			<SplitMapIcon map={badge.map} label={IN_SPLIT} />
		</span>
	);
}
