import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import { IsTooltipHosted, TooltipHost } from "@widgetarium/kit";
import { Slot, useCommand, useOptionalQuery, useQuery } from "@widgetarium/data-framework";
import { workspaces } from "@widgetarium/workspaces/contract";
import { TitleBar, TitleEnd } from "@sumi/sumi-host-plugin";
import { NewChatShortcut } from "../../../app-host/ui/new-chat-shortcut/new-chat-shortcut.js";
import { LinkOpener } from "../../../app-host/ui/link-opener/link-opener.js";
import { layout } from "@widgetarium/layout/contract";
import { FrameSideToggle } from "../../../frame-sides/ui/frame-side-toggle/frame-side-toggle.js";
import { FrameEdgeHandle } from "../../../frame-widths/ui/frame-edge/frame-edge.js";
import { PaneBoard } from "../../../panes/ui/pane-board/pane-board.js";
import type { PaneBoardProps } from "../../../panes/ui/pane-board/pane-board.js";
import { useWritesChromeLeft } from "../../lib/use-writes-chrome-left.js";
import { useWritesFrameWidths } from "../../lib/use-writes-frame-widths.js";
import { FrameSideColumn } from "./frame-side-column.js";
import { WindowLayers } from "./window-layers.js";

export interface StudioFrameProps {
	readonly frame: RefObject<HTMLDivElement | null>;
	readonly chromeLeftPx: number;
	readonly left: ReactNode;
	readonly panes: PaneBoardProps;
	readonly panel: ReactNode;
}

const FRAME_CLASS = "wg-studio wg-shell is-flat";
const TITLED_CLASS = "is-titled";
const SIDE_HIDDEN_CLASS = "is-side-hidden";

export function StudioFrame({ frame, chromeLeftPx, left, panes, panel }: StudioFrameProps): ReactElement {
	const widths = useQuery(layout.frameWidths.frameWidths).data;
	const sides = useQuery(layout.frameSides.frameSides).data;
	const resizeEdge = useCommand(layout.frameWidths.resizeEdge);
	const ink = useOptionalQuery(workspaces.workspaces.all).data?.current.ink ?? "yellow";
	const appZone = useRef<HTMLDivElement | null>(null);
	const leftSide = useRef<HTMLDivElement | null>(null);
	const isTitled = sides.tabs === "header";
	const modeClass = isTitled ? TITLED_CLASS : sides.left === "docked" ? "" : SIDE_HIDDEN_CLASS;
	useWritesFrameWidths(frame, widths);
	useWritesChromeLeft(frame, chromeLeftPx);
	return (
		<IsTooltipHosted.Provider value={true}>
			<div
				ref={frame}
				className={`${FRAME_CLASS} ${modeClass} sumi-ink-${ink}`}
				data-shell-frame=""
			>
				{isTitled ? (
					<Slot loading={null}>
						<TitleBar />
					</Slot>
				) : (
					<FrameSideColumn side="left" look={sides.left} panel={leftSide}>
						{left}
					</FrameSideColumn>
				)}
				{isTitled ? null : (
					<FrameEdgeHandle
						edge="left"
						px={widths.left}
						leastPx={widths.bounds.left.leastPx}
						plateLeastPx={widths.bounds.plateLeastPx}
						isReachable={sides.left === "docked"}
					/>
				)}
				<div ref={appZone} className="wg-shell-app-zone">
					<PaneBoard
						{...panes}
						chatPx={widths.chat}
						bounds={widths.bounds}
						onChatPx={(px, mostPx) =>
							void resizeEdge.run({
								edge: "chat",
								px,
								mostPx,
							})
						}
					/>
					{panel === null ? null : <div className="wg-shell-panel">{panel}</div>}
				</div>
				{isTitled ? null : <div className="wg-shell-corner-plate is-start" />}
				{isTitled ? null : <div className="wg-shell-corner-plate is-end" />}
				{isTitled ? null : <FrameSideToggle side="left" />}
				{isTitled ? null : (
					<div className="wg-root wg-shell-end">
						<Slot loading={null}>
							<TitleEnd />
						</Slot>
					</div>
				)}
				<LinkOpener frame={frame} />
				<Slot loading={null}>
					<WindowLayers />
					<NewChatShortcut frame={frame} />
				</Slot>
				<TooltipHost />
			</div>
		</IsTooltipHosted.Provider>
	);
}
