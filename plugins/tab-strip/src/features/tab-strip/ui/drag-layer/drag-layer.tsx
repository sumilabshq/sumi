import { Fragment, createElement as h } from "react";
import type { CSSProperties, ReactElement } from "react";
import { SPLIT_LABELS } from "../../lib/drag-aim.js";
import type { Box } from "../../lib/drag-aim.js";
import { tabOf } from "../../lib/strip-items.js";
import type { Lifted } from "../../lib/use-tab-drag.js";
import { TabIcons } from "../strip-tab/tab-icons.js";

export function DragLayer({ lifted }: { readonly lifted: Lifted }): ReactElement {
	const { aim, item } = lifted;
	return (
		<>
			{aim.kind === "split" ? (
				<div className="sumi-strip-split-zone" style={styleOf(aim.zone)}>
					<span className="sumi-strip-split-label">{SPLIT_LABELS[aim.side]}</span>
				</div>
			) : null}
			{aim.kind === "strip" ? <div className="sumi-strip-landing" style={styleOf(aim.line)} /> : null}
			<div
				className="sumi-strip-lifted"
				data-pinned={item.isPinned ? "" : undefined}
				style={{
					left: lifted.x,
					top: lifted.y,
				}}
			>
				<TabIcons item={item} />
				{item.isPinned ? null : <span className="sumi-strip-tab-title">{tabOf(item).title}</span>}
			</div>
		</>
	);
}

function styleOf(box: Box): CSSProperties {
	return {
		left: box.left,
		top: box.top,
		width: box.width,
		height: box.height,
	};
}
