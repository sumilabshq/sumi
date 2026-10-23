import { createElement as h } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import { IsTooltipHosted, TooltipHost } from "@widgetarium/kit";
import { useQuery } from "@widgetarium/core/requests";
import { FrameWidthsQuery } from "../../../features/frame-widths/contract.js";
import { FrameEdgeHandle } from "../../../features/frame-widths/ui/frame-edge/frame-edge.js";
import { useWritesFrameWidths } from "../../lib/use-writes-frame-widths.js";

export interface StudioFrameProps {
	readonly frame: RefObject<HTMLDivElement | null>;
	readonly left: ReactNode;
	readonly chat: ReactNode;
	readonly app: ReactNode;
	readonly panel: ReactNode;
	readonly right: ReactNode;
}

const FRAME_CLASS = "wg-studio wg-shell";

export function StudioFrame({ frame, left, chat, app, panel, right }: StudioFrameProps): ReactElement {
	const widths = useQuery(FrameWidthsQuery).data;
	useWritesFrameWidths(frame, widths);
	return (
		<IsTooltipHosted.Provider value={true}>
			<div ref={frame} className={FRAME_CLASS} data-shell-frame="">
				<div className="wg-shell-left" data-shell-column="left">
					{left}
				</div>
				<FrameEdgeHandle edge="left" px={widths.left} />
				{chat}
				<FrameEdgeHandle edge="chat" px={widths.chat} />
				<div className="wg-shell-app-zone">
					{app}
					{panel === null ? null : <div className="wg-shell-panel">{panel}</div>}
				</div>
				<div className="wg-shell-right" data-shell-column="right">
					{right}
				</div>
				<TooltipHost />
			</div>
		</IsTooltipHosted.Provider>
	);
}
