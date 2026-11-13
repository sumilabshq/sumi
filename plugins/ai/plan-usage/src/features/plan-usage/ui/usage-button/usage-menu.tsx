import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import type { MetersShown } from "@widgetarium/assistant/contract";
import { UsageMeter } from "./usage-meter.js";

export interface UsageMenuProps {
	readonly meter: MetersShown[number];
}

const NOT_YET = "Usage is reported with each answer. It shows here after the first one.";

export function UsageMenu({ meter }: UsageMenuProps): ReactElement {
	return (
		<>
			<div className="wg-kit-menu-label">{meter.label}</div>
			{!meter.isReported || meter.windows.length === 0 ? <p className="sumi-usage-note">{NOT_YET}</p> : null}
			{meter.windows.map((window) => (
				<UsageMeter key={window.key} title={window.label} used={window.used} resetsAt={window.resetsAt} />
			))}
		</>
	);
}
