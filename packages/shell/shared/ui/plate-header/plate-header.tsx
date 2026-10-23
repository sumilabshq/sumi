import { createElement as h, forwardRef, useContext, useMemo } from "react";
import type { PointerEvent, ReactNode } from "react";
import { CARRIED_PANE, PointerCarry } from "@widgetarium/behaviors";
import { FrameSideToggle } from "../../../features/frame-sides/ui/frame-side-toggle/frame-side-toggle.js";
import { PaneCloseContext } from "../../lib/pane-close-context.js";
import type { PaneClosing } from "../../lib/pane-close-context.js";
import { PlateHeaderContext } from "../../lib/plate-header-context.js";
import type { PlateHeaderPlace, PlateHeaderStore } from "../../lib/plate-header-store.js";
import { HeaderButton } from "./header-button.js";
import { PlateStrip } from "./plate-strip.js";

const CLOSE_PANE = "Close pane";
const PRIMARY_BUTTON = 0;
const NOT_A_HANDLE = "button, input, textarea, a, [contenteditable]";

export type PlateSide = "chat" | "app";

export interface PlateHeaderParts {
	readonly edgeStart: ReactNode;
	readonly lead: ReactNode;
	readonly crumb: ReactNode;
	readonly more: ReactNode;
	readonly edgeEnd: ReactNode;
}

export interface PlateHeaderProps extends PlateHeaderParts {
	readonly side: PlateSide;
}

type TargetRefs = Readonly<Record<PlateHeaderPlace, (element: HTMLElement | null) => void>>;

export const PlateHeader = forwardRef<HTMLElement, PlateHeaderProps>(function PlateHeader(
	{ side, edgeStart, lead, crumb, more, edgeEnd },
	ref,
) {
	const store = useContext(PlateHeaderContext);
	const paneClosing = useContext(PaneCloseContext);
	const targets = useMemo(() => targetRefsOf(store), [store]);
	return (
		<header
			ref={ref}
			className={`wg-plate-head is-${side}`}
			data-plate-head={side}
			data-pane-handle={paneClosing === null ? undefined : paneClosing.paneId}
			data-at-top-left={paneClosing?.isAtTopLeft === true ? "" : undefined}
			onPointerDown={paneClosing === null ? undefined : (event) => carryPane(event, paneClosing.paneId)}
		>
			<PlateStrip />
			<div className="wg-plate-head-row wg-root">
				{edgeStartOf(paneClosing, edgeStart)}
				<span className="wg-plate-slot" data-plate-place="lead">
					<span className="wg-plate-target" ref={targets.lead} />
					<span className="wg-plate-default">{lead}</span>
				</span>
				<span className="wg-plate-slot is-crumb" data-plate-place="crumb">
					<span className="wg-plate-target" ref={targets.crumb} />
					<span className="wg-plate-default">{crumb}</span>
				</span>
				<span className="wg-plate-gap" />
				<span className="wg-plate-slot" data-plate-place="controls">
					<span className="wg-plate-target" ref={targets.controls} />
				</span>
				{more}
				{paneClosing === null ? null : (
					<HeaderButton
						label={CLOSE_PANE}
						icon="x"
						className="wg-plate-button wg-pane-close"
						onClick={paneClosing.close}
						data-pane-close={paneClosing.paneId}
					/>
				)}
				{edgeEndOf(paneClosing, edgeEnd)}
			</div>
		</header>
	);
});

function targetRefsOf(store: PlateHeaderStore | null): TargetRefs {
	const placed =
		(place: PlateHeaderPlace) =>
		(element: HTMLElement | null): void =>
			store?.placeTarget(place, element);
	return {
		lead: placed("lead"),
		crumb: placed("crumb"),
		controls: placed("controls"),
	};
}

function edgeStartOf(paneClosing: PaneClosing | null, edgeStart: ReactNode): ReactNode {
	if (paneClosing === null) {
		return edgeStart;
	}

	if (!paneClosing.isAtTopLeft) {
		return null;
	}

	return edgeStart ?? <FrameSideToggle side="left" />;
}

function edgeEndOf(paneClosing: PaneClosing | null, edgeEnd: ReactNode): ReactNode {
	if (paneClosing === null) {
		return edgeEnd;
	}

	if (!paneClosing.isAtTopRight) {
		return null;
	}

	return edgeEnd ?? <FrameSideToggle side="right" />;
}

function carryPane(event: PointerEvent<HTMLElement>, paneId: string): void {
	if (
		event.button !== PRIMARY_BUTTON ||
		(event.target instanceof Element && event.target.closest(NOT_A_HANDLE) !== null)
	) {
		return;
	}

	new PointerCarry({
		item: {
			kind: CARRIED_PANE,
			id: paneId,
			title: "",
		},
		start: [event.clientX, event.clientY],
		isHome: () => false,
		onTaken: () => undefined,
	}).listen();
}
