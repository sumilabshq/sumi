import { createElement as h, memo } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import type { PaneView } from "@widgetarium/app-host/contract";
import { PANE_BODY_ATTRIBUTE } from "@sumi/flow-strip-plugin";
import { HomeSlot } from "../home-slot/home-slot.js";

export interface PageHostProps {
	readonly flowId: string;
	readonly paneId: string;
	readonly view: PaneView;
	readonly isActive: boolean;
	readonly place: CSSProperties;
	readonly drawn: (view: PaneView) => ReactNode;
	readonly onFocus: (paneId: string) => void;
}

export const PageHost = memo(function PageHost({
	flowId,
	paneId,
	view,
	isActive,
	place,
	drawn,
	onFocus,
}: PageHostProps): ReactElement {
	const isHome = view.kind === "app" && view.tabId === null;
	return (
		<div
			{...(isActive ? { [PANE_BODY_ATTRIBUTE]: paneId } : {})}
			className="sumi-flow-page"
			style={place}
			data-active={isActive ? "" : undefined}
			onPointerDownCapture={() => onFocus(paneId)}
			onFocusCapture={() => onFocus(paneId)}
		>
			{isHome ? (
				<HomeSlot flowId={flowId} paneId={paneId}>
					{drawn(view)}
				</HomeSlot>
			) : (
				drawn(view)
			)}
		</div>
	);
}, isSamePage);

function isSamePage(before: PageHostProps, after: PageHostProps): boolean {
	return (
		before.flowId === after.flowId &&
		before.paneId === after.paneId &&
		before.isActive === after.isActive &&
		before.drawn === after.drawn &&
		before.onFocus === after.onFocus &&
		JSON.stringify(before.view) === JSON.stringify(after.view) &&
		JSON.stringify(before.place) === JSON.stringify(after.place)
	);
}
