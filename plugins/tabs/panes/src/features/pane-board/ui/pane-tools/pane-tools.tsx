import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton, tooltipMarks } from "@widgetarium/kit";

export interface PaneToolsProps {
	readonly paneId: string;
	readonly isExpanded: boolean;
	readonly onExpand: () => void;
	readonly onClose: () => void;
}

const EXPAND = "Expand";
const RESTORE = "Restore size";
const CLOSE = "Close";
const ICON_PX = 16;
const EXPAND_TIP = tooltipMarks({ said: EXPAND, side: "bottom" });
const RESTORE_TIP = tooltipMarks({ said: RESTORE, side: "bottom" });
const CLOSE_TIP = tooltipMarks({ said: CLOSE, side: "bottom" });

export function PaneTools({ paneId, isExpanded, onExpand, onClose }: PaneToolsProps): ReactElement {
	return (
		<div className="sumi-pane-tools wg-root" data-pane-tools-of={paneId}>
			<IconButton
				variant="ghost"
				className="sumi-pane-tool"
				label={isExpanded ? RESTORE : EXPAND}
				aria-pressed={isExpanded}
				data-pane-expand={paneId}
				onClick={onExpand}
				{...(isExpanded ? RESTORE_TIP : EXPAND_TIP)}
			>
				<Icon name={isExpanded ? "minimize-2" : "maximize-2"} size={ICON_PX} />
			</IconButton>
			<IconButton
				variant="ghost"
				className="sumi-pane-tool"
				label={CLOSE}
				data-pane-close={paneId}
				onClick={onClose}
				{...CLOSE_TIP}
			>
				<Icon name="x" size={ICON_PX} />
			</IconButton>
		</div>
	);
}
