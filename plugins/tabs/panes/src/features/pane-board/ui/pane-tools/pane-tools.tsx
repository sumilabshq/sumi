import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon, tooltipMarks } from "@widgetarium/kit";

export interface PaneToolsProps {
	readonly paneId: string;
	readonly isExpanded: boolean;
	readonly onExpand: () => void;
	readonly onHide: () => void;
}

const EXPAND = "Expand";
const RESTORE = "Restore size";
const HIDE = "Hide";
const ICON_PX = 16;
const EXPAND_TIP = tooltipMarks({ said: EXPAND, side: "bottom" });
const RESTORE_TIP = tooltipMarks({ said: RESTORE, side: "bottom" });
const HIDE_TIP = tooltipMarks({ said: HIDE, side: "bottom" });

export function PaneTools({ paneId, isExpanded, onExpand, onHide }: PaneToolsProps): ReactElement {
	return (
		<div className="sumi-pane-tools wg-root" data-pane-tools-of={paneId}>
			<Button
				shape="square"
				emphasis="ghost"
				size="sm"
				label={isExpanded ? RESTORE : EXPAND}
				aria-pressed={isExpanded}
				data-pane-expand={paneId}
				onClick={onExpand}
				{...(isExpanded ? RESTORE_TIP : EXPAND_TIP)}
			>
				<Icon name={isExpanded ? "minimize-2" : "maximize-2"} size={ICON_PX} />
			</Button>
			<Button
				shape="square"
				emphasis="ghost"
				size="sm"
				label={HIDE}
				data-pane-hide={paneId}
				onClick={onHide}
				{...HIDE_TIP}
			>
				<Icon name="x" size={ICON_PX} />
			</Button>
		</div>
	);
}
