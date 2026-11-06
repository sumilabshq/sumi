import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import { IsTooltipHosted, TooltipHost } from "@widgetarium/kit";
import { Slot, useCommand, useQuery } from "@widgetarium/framework";
import { CommandMenu } from "../../../command-menu/ui/command-menu/command-menu.js";
import { CommandMenuKeys } from "../../../command-menu/ui/command-menu-keys/command-menu-keys.js";
import { NewChatShortcut } from "../../../app-host/ui/new-chat-shortcut/new-chat-shortcut.js";
import { LinkOpener } from "../../../app-host/ui/link-opener/link-opener.js";
import { FrameSidesQuery } from "@widgetarium/layout";
import { FrameSideReveal } from "../../../frame-sides/ui/frame-side-reveal/frame-side-reveal.js";
import { FrameSideToggle } from "../../../frame-sides/ui/frame-side-toggle/frame-side-toggle.js";
import { FrameWidthsQuery, ResizeFrameEdgeCommand } from "@widgetarium/layout";
import { FrameEdgeHandle } from "../../../frame-widths/ui/frame-edge/frame-edge.js";
import { PaneBoard } from "../../../panes/ui/pane-board/pane-board.js";
import type { PaneBoardProps } from "../../../panes/ui/pane-board/pane-board.js";
import { useWritesChromeLeft } from "../../lib/use-writes-chrome-left.js";
import { useWritesFrameWidths } from "../../lib/use-writes-frame-widths.js";
import { FrameSideColumn } from "./frame-side-column.js";

export interface StudioFrameProps {
	readonly frame: RefObject<HTMLDivElement | null>;
	readonly chromeLeftPx: number;
	readonly left: ReactNode;
	readonly panes: PaneBoardProps;
	readonly panel: ReactNode;
}

const FRAME_CLASS = "wg-studio wg-shell";

export function StudioFrame({ frame, chromeLeftPx, left, panes, panel }: StudioFrameProps): ReactElement {
	const widths = useQuery(FrameWidthsQuery).data;
	const sides = useQuery(FrameSidesQuery).data;
	const resizeEdge = useCommand(ResizeFrameEdgeCommand);
	const appZone = useRef<HTMLDivElement | null>(null);
	const leftSide = useRef<HTMLDivElement | null>(null);
	useWritesFrameWidths(frame, widths);
	useWritesChromeLeft(frame, chromeLeftPx);
	return (
		<IsTooltipHosted.Provider value={true}>
			<div ref={frame} className={FRAME_CLASS} data-shell-frame="">
				<FrameSideColumn side="left" look={sides.left} panel={leftSide}>
					{left}
				</FrameSideColumn>
				<FrameEdgeHandle
					edge="left"
					px={widths.left}
					leastPx={widths.bounds.left.leastPx}
					plateLeastPx={widths.bounds.plateLeastPx}
					isReachable={sides.left === "docked"}
				/>
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
				<FrameSideReveal frame={frame} content={appZone} panel={leftSide} />
				<FrameSideToggle side="left" />
				<LinkOpener frame={frame} />
				<Slot loading={null}>
					<CommandMenu />
					<CommandMenuKeys />
					<NewChatShortcut frame={frame} />
				</Slot>
				<TooltipHost />
			</div>
		</IsTooltipHosted.Provider>
	);
}
