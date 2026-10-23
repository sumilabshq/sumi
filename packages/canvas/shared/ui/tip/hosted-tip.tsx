import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { tooltipMarks } from "@widgetarium/kit";

export const TIP_TRIGGER = "cv:relative cv:inline-flex cv:[--no-tooltip:true]";

export function HostedTip({ label, trigger }: { readonly label: string; readonly trigger?: ReactNode }): ReactElement {
	return (
		<span className={TIP_TRIGGER} {...tooltipMarks({ said: label, side: "bottom" })}>
			{trigger}
		</span>
	);
}
