import { Fragment, createElement as h, useEffect, useRef } from "react";
import type { ReactElement, RefObject } from "react";
import { useEdgeReveal } from "@widgetarium/behaviors";
import type { EdgeLook } from "@widgetarium/behaviors";
import { useCommand, useQuery } from "@widgetarium/framework";
import type { FrameSide, SideLook } from "@widgetarium/layout";
import {
	ConcealFrameSideCommand,
	FrameSidesQuery,
	PeekFrameSideCommand,
	ToggleFrameSideCommand,
} from "@widgetarium/layout";
import { SIDE_KEYS } from "../../lib/side-keys.js";

export interface FrameSideRevealProps {
	readonly frame: RefObject<HTMLElement | null>;
	readonly content: RefObject<HTMLElement | null>;
	readonly panel: RefObject<HTMLElement | null>;
}

const EDGE_LOOK: Readonly<Record<SideLook, EdgeLook>> = {
	docked: "fixed",
	hidden: "tucked",
	peeking: "out",
};

const SIDES: readonly FrameSide[] = ["left"];
const NO_PANEL: RefObject<HTMLElement | null> = { current: null };

export function FrameSideReveal({ frame, content, panel }: FrameSideRevealProps): ReactElement {
	const sides = useQuery(FrameSidesQuery).data;
	const peek = useCommand(PeekFrameSideCommand);
	const conceal = useCommand(ConcealFrameSideCommand);
	const toggle = useCommand(ToggleFrameSideCommand);
	useSideKeys(frame, (side) => void toggle.run({ side }));
	useEdgeReveal({
		frame,
		content,
		panels: {
			left: panel,
			right: NO_PANEL,
		},
		sides: {
			left: EDGE_LOOK[sides.left],
			right: EDGE_LOOK.docked,
		},
		reveal: (side) => runOnFrameSide(side, (frameSide) => void peek.run({ side: frameSide })),
		conceal: (side) => runOnFrameSide(side, (frameSide) => void conceal.run({ side: frameSide })),
	});
	return (
		<Fragment>
			{SIDES.filter((side) => sides[side] === "peeking").map((side) => (
				<div key={side} className="wg-shell-side-footprint" data-side={side} data-covers-pages="" />
			))}
		</Fragment>
	);
}

function runOnFrameSide(side: string, run: (side: FrameSide) => void): void {
	const frameSide = SIDES.find((one) => one === side);

	if (frameSide !== undefined) {
		run(frameSide);
	}
}

const EDITABLE_SELECTOR = "[contenteditable]:not([contenteditable='false'])";

function useSideKeys(frame: RefObject<HTMLElement | null>, onToggle: (side: FrameSide) => void): void {
	const latest = useRef(onToggle);
	latest.current = onToggle;

	useEffect(() => {
		const onKey = (event: KeyboardEvent): void => {
			const side = sideOfKeydown(event);
			const frameElement = frame.current;

			if (side === null || frameElement === null || event.defaultPrevented || !isKeydownForFrame(frameElement, event)) {
				return;
			}

			event.preventDefault();
			latest.current(side);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [frame]);
}

function sideOfKeydown(event: KeyboardEvent): FrameSide | null {
	if (!(event.metaKey || event.ctrlKey) || event.shiftKey) {
		return null;
	}

	return SIDES.find((side) => SIDE_KEYS[side].code === event.code && SIDE_KEYS[side].needsAlt === event.altKey) ?? null;
}

function isKeydownForFrame(frame: HTMLElement, event: KeyboardEvent): boolean {
	const target = event.target;

	if (target instanceof Element && target.closest(EDITABLE_SELECTOR) !== null) {
		return false;
	}

	if (target instanceof Node && frame.contains(target)) {
		return true;
	}

	return frame.ownerDocument.activeElement === frame.ownerDocument.body;
}
