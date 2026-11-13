import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { SumiFigure, sumiStateOf } from "@sumi/sumi-host-plugin";
import { AgentActivitySchema, mascot } from "@widgetarium/mascot/contract";
import { useMascotState } from "../../lib/mascot-state.js";

const NO_AGENT_ACTIVITY = AgentActivitySchema.parse({});

export interface MascotProps {
	readonly size: number;
}

export function Mascot({ size }: MascotProps): ReactElement {
	const activity = useOptionalQuery(mascot.activity.agentActivity).data ?? NO_AGENT_ACTIVITY;
	const { state, touchHandlers } = useMascotState(activity);
	return (
		<span className="sumi-mascot" {...touchHandlers}>
			<SumiFigure state={sumiStateOf(state)} size={size} />
		</span>
	);
}
