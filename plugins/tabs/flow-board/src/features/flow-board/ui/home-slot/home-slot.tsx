import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { PluginSlot } from "@widgetarium/plugin-framework/react";

export interface HomeSlotProps {
	readonly flowId: string;
	readonly paneId: string;
	readonly children: ReactNode;
}

export function HomeSlot({ flowId, paneId, children }: HomeSlotProps): ReactElement {
	return (
		<PluginSlot name="flow-board.home" props={{ flowId, paneId }}>
			{children}
		</PluginSlot>
	);
}
