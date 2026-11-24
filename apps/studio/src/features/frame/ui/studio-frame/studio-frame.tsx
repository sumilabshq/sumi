import { createElement as h } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import { IsTooltipHosted, TooltipHost } from "@widgetarium/kit";
import { Slot, useCommand, useOptionalQuery, useQuery } from "@widgetarium/data-framework";
import { workspaces } from "@widgetarium/workspaces/contract";
import { FrameStart, PaneBoardSlot, TitleBar } from "@sumi/sumi-host-plugin";
import type { PaneBoardViews } from "@sumi/sumi-host-plugin";
import { NewChatShortcut } from "../../../app-host/ui/new-chat-shortcut/new-chat-shortcut.js";
import { LinkOpener } from "../../../app-host/ui/link-opener/link-opener.js";
import { layout } from "@widgetarium/layout/contract";
import { hushesNativeMenu } from "../../lib/hushes-native-menu.js";
import { useWritesChromeLeft } from "../../lib/use-writes-chrome-left.js";
import { useWritesFrameWidths } from "../../lib/use-writes-frame-widths.js";
import { WindowLayers } from "./window-layers.js";

export interface StudioFrameProps {
	readonly frame: RefObject<HTMLDivElement | null>;
	readonly chromeLeftPx: number;
	readonly panes: PaneBoardViews;
	readonly panel: ReactNode;
}

const FRAME_CLASS = "wg-studio wg-root wg-shell is-flat";

export function StudioFrame({ frame, chromeLeftPx, panes, panel }: StudioFrameProps): ReactElement {
	const widths = useQuery(layout.frameWidths.frameWidths).data;
	const resizeEdge = useCommand(layout.frameWidths.resizeEdge);
	const ink = useOptionalQuery(workspaces.workspaces.all).data?.current.ink ?? "yellow";
	useWritesFrameWidths(frame, widths);
	useWritesChromeLeft(frame, chromeLeftPx);
	return (
		<IsTooltipHosted.Provider value={true}>
			<div
				ref={frame}
				className={`${FRAME_CLASS} sumi-ink-${ink}`}
				data-shell-frame=""
				onContextMenu={hushesNativeMenu}
			>
				<Slot loading={null}>
					<TitleBar />
				</Slot>
				<div className="wg-shell-body">
					<Slot loading={null}>
						<FrameStart />
					</Slot>
					<div className="wg-shell-app-zone">
						<PaneBoardSlot
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
				</div>
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
