import { Fragment, createElement as h, useEffect, useRef } from "react";
import type { ReactElement, RefObject } from "react";
import { useEdgeReveal } from "@widgetarium/behaviors";
import type { EdgeLook } from "@widgetarium/behaviors";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import type { FrameSide, SideLook } from "../../../../shared/schema/frame-sides.schema.js";
import {
	ConcealFrameSideCommand,
	FrameSidesQuery,
	PeekFrameSideCommand,
	ToggleFrameSideCommand,
} from "../../contract.js";
import { SIDE_KEYS } from "../../lib/side-keys.js";

export interface FrameSideRevealProps {
	readonly frame: RefObject<HTMLElement | null>;
	readonly content: RefObject<HTMLElement | null>;
	readonly panels: Readonly<Record<FrameSide, RefObject<HTMLElement | null>>>;
}

const EDGE_LOOK: Readonly<Record<SideLook, EdgeLook>> = {
	docked: "fixed",
	hidden: "tucked",
	peeking: "out",
};

const SIDES: readonly FrameSide[] = ["left", "right"];

export function FrameSideReveal({ frame, content, panels }: FrameSideRevealProps): ReactElement {
	const sides = useQuery(FrameSidesQuery).data;
	const peek = useCommand(PeekFrameSideCommand);
	const conceal = useCommand(ConcealFrameSideCommand);
	const toggle = useCommand(ToggleFrameSideCommand);
	useSideKeys(frame, (side) => void toggle.run({ side }));
	useEdgeReveal({
		frame,
		content,
		panels,
		sides: {
			left: EDGE_LOOK[sides.left],
			right: EDGE_LOOK[sides.right],
		},
		reveal: (side) => void peek.run({ side }),
		conceal: (side) => void conceal.run({ side }),
	});
	return (
		<Fragment>
			{SIDES.filter((side) => sides[side] === "peeking").map((side) => (
				<div key={side} className="wg-shell-side-footprint" data-side={side} data-covers-pages="" />
			))}
		</Fragment>
	);
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
