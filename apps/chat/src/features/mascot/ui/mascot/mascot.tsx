import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery } from "@widgetarium/core/requests";
import { AgentActivityQuery, AgentActivitySchema } from "@widgetarium/mascot";
import { useMascotState } from "../../lib/mascot-state.js";
import type { OutfitId } from "../../lib/outfit.schema.js";
import { MascotFigure } from "../mascot-figure/mascot-figure.js";

const NO_AGENT_ACTIVITY = AgentActivitySchema.parse({});

export interface MascotProps {
	readonly outfit?: OutfitId;
	readonly size: number;
}

export function Mascot({ outfit = "bare", size }: MascotProps): ReactElement {
	const activity = useOptionalQuery(AgentActivityQuery).data ?? NO_AGENT_ACTIVITY;
	const { state, touchHandlers } = useMascotState(activity);
	return <MascotFigure outfit={outfit} size={size} state={state} touchHandlers={touchHandlers} />;
}
