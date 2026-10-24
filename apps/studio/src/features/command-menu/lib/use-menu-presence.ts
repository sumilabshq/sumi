import { useEffect, useState } from "react";
import type { TransitionEvent } from "react";

export interface MenuPresence {
	readonly isMounted: boolean;
	readonly isShown: boolean;
	readonly settled: (event: TransitionEvent<HTMLElement>) => void;
}

const LEAVE_AT_LATEST_MS = 260;

export function useMenuPresence(isOpen: boolean): MenuPresence {
	const [isMounted, setMounted] = useState(isOpen);
	const [isShown, setShown] = useState(false);
	useEffect(() => {
		if (!isOpen) {
			setShown(false);
			const leave = setTimeout(() => setMounted(false), LEAVE_AT_LATEST_MS);
			return () => clearTimeout(leave);
		}

		setMounted(true);
		const frame = requestAnimationFrame(() => setShown(true));
		return () => cancelAnimationFrame(frame);
	}, [isOpen]);
	return {
		isMounted,
		isShown,
		settled: (event) => {
			if (!isOpen && event.target === event.currentTarget) {
				setMounted(false);
			}
		},
	};
}
