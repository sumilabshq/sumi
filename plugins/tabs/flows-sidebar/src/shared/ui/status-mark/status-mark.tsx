import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { FlowStatus } from "@widgetarium/navigation/contract";
import { RunningRing } from "./running-ring.js";

const STATUS_ICON_PX = 12;

const SAID: Readonly<Record<FlowStatus, string>> = {
	failed: "Failed",
	asking: "Needs you",
	running: "Running",
	unread: "Done",
};

export interface StatusMarkProps {
	readonly status: FlowStatus | null;
}

export function StatusMark({ status }: StatusMarkProps): ReactElement | null {
	if (status === null) {
		return null;
	}

	return (
		<span className="sumi-flows-status" data-status={status} role="img" aria-label={SAID[status]}>
			{status === "unread" ? <Icon name="tick" size={STATUS_ICON_PX} /> : null}
			{status === "running" ? <RunningRing /> : null}
		</span>
	);
}
