import { createElement as h, forwardRef, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { PlateHeaderContext } from "../../lib/plate-header-context.js";
import type { PlateHeaderPlace, PlateHeaderStore } from "../../lib/plate-header-store.js";
import { PlateStrip } from "./plate-strip.js";

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
	const targets = useMemo(() => targetRefsOf(store), [store]);
	return (
		<header ref={ref} className={`wg-plate-head is-${side}`} data-plate-head={side}>
			<PlateStrip />
			<div className="wg-plate-head-row wg-root">
				{edgeStart}
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
				{edgeEnd}
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
