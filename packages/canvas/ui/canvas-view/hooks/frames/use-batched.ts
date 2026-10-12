import { useCallback, useEffect, useRef } from "react";

export function useBatched<T>(send: (batch: readonly T[]) => void): (item: T) => void {
	const waiting = useRef<T[]>([]);
	const frame = useRef(0);
	const sent = useRef(send);
	sent.current = send;
	useEffect(() => () => window.cancelAnimationFrame(frame.current), []);
	return useCallback((item: T) => {
		waiting.current.push(item);
		if (frame.current) return;
		frame.current = window.requestAnimationFrame(() => {
			frame.current = 0;
			sent.current(waiting.current.splice(0));
		});
	}, []);
}
