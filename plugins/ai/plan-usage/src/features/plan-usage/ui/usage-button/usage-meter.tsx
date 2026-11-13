import { createElement as h } from "react";
import type { ReactElement } from "react";
import { percentOf, resetSaidOf } from "../../lib/usage-said.js";

export interface UsageMeterProps {
	readonly title: string;
	readonly used: number;
	readonly resetsAt: number;
}

export function UsageMeter({ title, used, resetsAt }: UsageMeterProps): ReactElement {
	return (
		<div className="sumi-usage-meter">
			<div className="sumi-usage-meter-head">
				<b>{title}</b>
				<span>{percentOf(used)}</span>
			</div>
			<div className="sumi-usage-meter-bar">
				<i style={{ width: `${Math.min(100, Math.round(used * 100))}%` }} />
			</div>
			<small>{resetSaidOf(resetsAt, Date.now())}</small>
		</div>
	);
}
