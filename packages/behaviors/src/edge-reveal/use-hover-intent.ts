import { useEffect, useRef, useState } from "react";

export interface HoverIntentHandlers {
	readonly onPointerEnter: () => void;
	readonly onPointerLeave: () => void;
	readonly onPointerDown: () => void;
}

const HOVER_INTENT_MS = 80;

export function useHoverIntent(onIntent: () => void): HoverIntentHandlers {
	const latest = useRef(onIntent);
	latest.current = onIntent;
	const [timer] = useState(() => new IntentTimer());

	useEffect(() => () => timer.clear(), [timer]);

	return {
		onPointerEnter: () => timer.start(() => latest.current()),
		onPointerLeave: () => timer.clear(),
		onPointerDown: () => timer.clear(),
	};
}

class IntentTimer {
	private pending: number | null = null;

	start(onIntent: () => void): void {
		this.clear();
		this.pending = window.setTimeout(() => {
			this.pending = null;
			onIntent();
		}, HOVER_INTENT_MS);
	}

	clear(): void {
		if (this.pending === null) {
			return;
		}

		window.clearTimeout(this.pending);
		this.pending = null;
	}
}
