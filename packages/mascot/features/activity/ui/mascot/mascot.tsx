import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery } from "@widgetarium/core/requests";
import { AgentActivityQuery } from "../../contract.js";
import { NO_AGENT_ACTIVITY } from "../../../../shared/lib/agent-activity-store.js";
import { useMascotState } from "../../lib/mascot-state.js";
import type { OutfitId } from "../../../../shared/schema/outfit.schema.js";
import { MascotFigure } from "../../../../shared/ui/mascot/mascot-figure.js";

export interface MascotProps {
	readonly outfit?: OutfitId;
	readonly size: number;
}

export function Mascot({ outfit = "bare", size }: MascotProps): ReactElement {
	const activity = useOptionalQuery(AgentActivityQuery).data ?? NO_AGENT_ACTIVITY;
	const { state, touchHandlers } = useMascotState(activity);
	return <MascotFigure outfit={outfit} size={size} state={state} touchHandlers={touchHandlers} />;
}
