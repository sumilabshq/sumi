import { createElement as h, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
import { TipBubble } from "./tip-bubble.js";
import type { Placed } from "./tip-bubble.js";

const SHOWN_AFTER_MS = 400;
const BELOW_PX = 10;

export function Tip({ label, children }: { readonly label: string; readonly children?: ReactNode }): ReactElement {
	const [placed, setPlaced] = useState<Placed | null>(null);
	const timer = useRef(0);
	const anchor = useRef<HTMLSpanElement | null>(null);
	const show = (): void => {
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => {
			const box = anchor.current?.getBoundingClientRect();
			if (box) setPlaced({ left: box.left + box.width / 2, top: box.bottom + BELOW_PX });
		}, SHOWN_AFTER_MS);
	};
	const hide = (): void => {
		window.clearTimeout(timer.current);
		setPlaced(null);
	};
	return (
		<span
			className="cv:relative cv:inline-flex"
			ref={anchor}
			onMouseEnter={show}
			onMouseLeave={hide}
			onPointerDown={hide}
		>
			{children}
			{placed ? createPortal(<TipBubble label={label} placed={placed} />, document.body) : null}
		</span>
	);
}
