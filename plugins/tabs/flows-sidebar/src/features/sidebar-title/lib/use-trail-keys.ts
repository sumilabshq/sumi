import { useEffect, useRef } from "react";

export interface TrailKeyActs {
	readonly back: () => void;
	readonly forward: () => void;
}

const BACK_KEY = "[";
const FORWARD_KEY = "]";

export function useTrailKeys(acts: TrailKeyActs): void {
	const latest = useRef(acts);
	latest.current = acts;
	useEffect(() => {
		const pressed = (event: KeyboardEvent): void => {
			const run = event.defaultPrevented || !isCommandKey(event) ? null : runOfKey(event.key, latest.current);

			if (run === null) {
				return;
			}

			event.preventDefault();
			run();
		};
		window.addEventListener("keydown", pressed);
		return () => window.removeEventListener("keydown", pressed);
	}, []);
}

function runOfKey(key: string, acts: TrailKeyActs): (() => void) | null {
	if (key === BACK_KEY) {
		return acts.back;
	}

	return key === FORWARD_KEY ? acts.forward : null;
}

function isCommandKey(event: KeyboardEvent): boolean {
	return event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey;
}
