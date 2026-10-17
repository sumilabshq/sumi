import { createElement as h, useId } from "react";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@widgetarium/kit";

export interface RailTileProps {
	readonly label: string;
	readonly children: ReactNode;
	readonly isCurrent?: boolean;
	readonly onPress?: (() => void) | undefined;
	readonly onContextMenu?: ((event: MouseEvent) => void) | undefined;
}

// TRADE-OFF: named by aria-labelledby, not aria-label; Obsidian draws its own tooltip for every aria-label
export function RailTile({ label, children, isCurrent = false, onPress, onContextMenu }: RailTileProps): ReactElement {
	const labelId = useId();
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					className="wg-studio-rail-tile"
					aria-labelledby={labelId}
					aria-current={isCurrent ? "true" : undefined}
					onClick={onPress}
					onContextMenu={onContextMenu}
				>
					{children}
					<span id={labelId} className="wg-kit-sr-only">
						{label}
					</span>
				</button>
			</TooltipTrigger>
			<TooltipContent side="right">{label}</TooltipContent>
		</Tooltip>
	);
}
