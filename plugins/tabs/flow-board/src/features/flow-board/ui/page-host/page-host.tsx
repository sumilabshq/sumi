import { createElement as h, memo } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import type { PaneView } from "@widgetarium/app-host/contract";
import { PANE_BODY_ATTRIBUTE } from "@sumi/flow-strip-plugin";

export interface PageHostProps {
	readonly paneId: string;
	readonly view: PaneView;
	readonly isActive: boolean;
	readonly place: CSSProperties;
	readonly drawn: (view: PaneView) => ReactNode;
	readonly onFocus: (paneId: string) => void;
}

export const PageHost = memo(function PageHost({ paneId, view, isActive, place, drawn, onFocus }: PageHostProps): ReactElement {
	return (
		<div
			{...(isActive ? { [PANE_BODY_ATTRIBUTE]: paneId } : {})}
			className="sumi-flow-page"
			style={place}
			data-active={isActive ? "" : undefined}
			onPointerDownCapture={() => onFocus(paneId)}
			onFocusCapture={() => onFocus(paneId)}
		>
			{drawn(view)}
		</div>
	);
}, isSamePage);

function isSamePage(before: PageHostProps, after: PageHostProps): boolean {
	return (
		before.paneId === after.paneId &&
		before.isActive === after.isActive &&
		before.drawn === after.drawn &&
		before.onFocus === after.onFocus &&
		JSON.stringify(before.view) === JSON.stringify(after.view) &&
		JSON.stringify(before.place) === JSON.stringify(after.place)
	);
}
