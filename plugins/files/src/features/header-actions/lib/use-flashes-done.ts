import { useEffect, useRef, useState } from "react";

export interface DoneFlash {
	readonly isDone: boolean;
	readonly run: (action: () => unknown) => void;
}

const DONE_SHOWN_MS = 1500;
const FAILED = "[files] header action failed";

export function useFlashesDone(): DoneFlash {
	const [isDone, setIsDone] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => () => clearDoneTimer(timer), []);
	return {
		isDone,
		run: (action) => {
			Promise.resolve()
				.then(action)
				.then(
					() => {
						clearDoneTimer(timer);
						setIsDone(true);
						timer.current = setTimeout(() => setIsDone(false), DONE_SHOWN_MS);
					},
					(error: unknown) => console.error(FAILED, error),
				);
		},
	};
}

function clearDoneTimer(timer: { current: ReturnType<typeof setTimeout> | null }): void {
	if (timer.current !== null) {
		clearTimeout(timer.current);
	}
}
