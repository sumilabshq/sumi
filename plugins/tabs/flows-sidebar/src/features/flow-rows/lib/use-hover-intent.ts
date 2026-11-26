import { useEffect, useRef, useState } from "react";

export interface HoverIntent {
	readonly isOpen: boolean;
	readonly enter: () => void;
	readonly leave: () => void;
	readonly close: () => void;
}

export interface HoverDelays {
	readonly openMs: number;
	readonly closeMs: number;
}

export function useHoverIntent({ openMs, closeMs }: HoverDelays): HoverIntent {
	const [isOpen, setIsOpen] = useState(false);
	const timer = useRef(0);
	useEffect(() => () => window.clearTimeout(timer.current), []);
	useEffect(() => {
		const close = (): void => {
			window.clearTimeout(timer.current);
			setIsOpen(false);
		};
		document.addEventListener("dragstart", close, true);
		return () => document.removeEventListener("dragstart", close, true);
	}, []);
	const settleAfter = (ms: number, isOpening: boolean): void => {
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => setIsOpen(isOpening), ms);
	};
	return {
		isOpen,
		enter: () => settleAfter(openMs, true),
		leave: () => settleAfter(closeMs, false),
		close: () => {
			window.clearTimeout(timer.current);
			setIsOpen(false);
		},
	};
}
