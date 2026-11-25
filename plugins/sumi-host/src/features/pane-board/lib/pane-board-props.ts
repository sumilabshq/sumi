import type { ReactNode } from "react";
import type { PaneView } from "@widgetarium/app-host/contract";
import type { FrameBounds } from "@widgetarium/layout/contract";

export interface PaneBoardViews {
	readonly drawn: (view: PaneView) => ReactNode;
}

export interface PaneBoardProps extends PaneBoardViews {
	readonly chatPx: number;
	readonly bounds: FrameBounds;
	readonly onChatPx: (px: number, mostPx: number) => void;
}
