import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { RecentFlow } from "../../lib/recent-flows-of.js";

const SAID: Readonly<Record<NonNullable<RecentFlow["status"]>, string>> = {
	failed: "Failed",
	asking: "Needs you",
	running: "Running",
	unread: "Done",
};

const STATUS_ICON_PX = 12;

export function FlowStatus({ status }: { readonly status: RecentFlow["status"] }): ReactElement | null {
	if (status === null) {
		return null;
	}

	return (
		<span className="sumi-home-status" data-status={status} role="img" aria-label={SAID[status]}>
			{status === "unread" ? <Icon name="tick" size={STATUS_ICON_PX} /> : null}
			{status === "running" ? <RunningRing /> : null}
		</span>
	);
}

function RunningRing(): ReactElement {
	return (
		<svg className="sumi-home-ring-spin" viewBox="0 0 16 16" width={STATUS_ICON_PX} height={STATUS_ICON_PX} aria-hidden="true">
			<circle className="sumi-home-ring-track" cx="8" cy="8" r="5.5" />
			<path className="sumi-home-ring-arc" d="M8 2.5a5.5 5.5 0 0 1 5.5 5.5" />
		</svg>
	);
}
