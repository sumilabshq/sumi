import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import type { ContextFill, MetersShown } from "@widgetarium/assistant/contract";
import { PopoverSeparator } from "@widgetarium/kit";
import { contextSaidOf, resetSaidOf } from "../../lib/usage-said.js";
import { UsageMeter } from "./usage-meter.js";

export interface UsageMenuProps {
	readonly meter: MetersShown[number];
	readonly context: ContextFill | null;
}

const NOT_YET = "Usage is reported with each answer. It shows here after the first one.";
const SESSION = "Session";
const CONTEXT = "Context";
const CONTEXT_NOT_YET = "Context is reported at the end of each answer.";

export function UsageMenu({ meter, context }: UsageMenuProps): ReactElement {
	return (
		<>
			<div className="wg-kit-menu-label">{meter.label}</div>
			{!meter.isReported || meter.windows.length === 0 ? <p className="sumi-usage-note">{NOT_YET}</p> : null}
			{meter.windows.map((window) => (
				<UsageMeter
					key={window.key}
					title={window.label}
					used={window.used}
					note={resetSaidOf(window.resetsAt, Date.now())}
				/>
			))}
			<PopoverSeparator />
			<div className="wg-kit-menu-label">{SESSION}</div>
			{context === null ? (
				<p className="sumi-usage-note">{CONTEXT_NOT_YET}</p>
			) : (
				<UsageMeter title={CONTEXT} used={context.used / context.window} note={contextSaidOf(context)} />
			)}
		</>
	);
}
