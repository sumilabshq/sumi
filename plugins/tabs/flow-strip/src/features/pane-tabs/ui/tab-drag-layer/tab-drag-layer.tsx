import { createElement as h } from "react";
import type { CSSProperties, ReactElement } from "react";
import type { Box, DragAim } from "../../lib/drag-aim.js";
import type { Lifted } from "../../lib/use-tab-drag.js";

export function TabDragLayer({ lifted }: { readonly lifted: Lifted }): ReactElement {
	return (
		<div className="sumi-pane-drag" aria-hidden="true">
			<div
				className="sumi-pane-ghost"
				style={{
					left: lifted.point.x,
					top: lifted.point.y,
				}}
			>
				{lifted.label}
			</div>
			{lifted.aim === null ? null : <AimMark aim={lifted.aim} />}
		</div>
	);
}

function AimMark({ aim }: { readonly aim: DragAim }): ReactElement {
	if (aim.kind === "insert") {
		return <div className="sumi-pane-insert" style={styleOf(aim.mark)} />;
	}

	return <div className="sumi-pane-zone" data-aim={aim.kind === "split" ? aim.side : "append"} style={styleOf(aim.zone)} />;
}

function styleOf(box: Box): CSSProperties {
	return {
		left: box.left,
		top: box.top,
		width: box.width,
		height: box.height,
	};
}
