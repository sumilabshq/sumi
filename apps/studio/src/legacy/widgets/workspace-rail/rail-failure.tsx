import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, Tooltip, TooltipContent, TooltipTrigger } from "@widgetarium/kit";

export interface RailFailureProps {
	readonly said: string;
}

export function RailFailure({ said }: RailFailureProps): ReactElement {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="wg-studio-rail-tile is-failure" role="status" data-name="Workspaces failure">
					<Icon name="circle-alert" />
					<span className="wg-kit-sr-only">{said}</span>
				</span>
			</TooltipTrigger>
			<TooltipContent side="right">{said}</TooltipContent>
		</Tooltip>
	);
}
