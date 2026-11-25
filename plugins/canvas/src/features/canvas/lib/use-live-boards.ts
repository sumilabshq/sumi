import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PanZoom } from "@widgetarium/behaviors";
import { boardsInView, liveBoardIds, nextToLoad } from "./live-boards.js";
import type { BoardBox } from "./live-boards.js";

export interface LiveBoards {
	readonly liveIds: ReadonlySet<string>;
	readonly onBoardLoaded: (boardId: string) => void;
}

const LOAD_PATIENCE_MS = 4000;
const QUICK_LOAD_MS = 50;
const STILL_MS = 150;
const NOTHING_IN_VIEW: readonly string[] = [];
const NOTHING_LOADED: ReadonlySet<string> = new Set();

function isSameOrder(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function useLiveBoards(
	boards: readonly BoardBox[],
	pan: Pick<PanZoom, "fieldRef" | "lookNow" | "watchLook">,
	originPx: number,
): LiveBoards {
	const [inView, setInView] = useState(NOTHING_IN_VIEW);
	const [loaded, setLoaded] = useState(NOTHING_LOADED);
	const [loadingId, setLoadingId] = useState<string | null>(null);
	const fieldSize = useRef({ width: 0, height: 0 });
	const movedAt = useRef(0);
	const grantedId = useRef<string | null>(null);
	const grantedAt = useRef(0);
	const lastLoadMs = useRef(0);
	const { fieldRef, lookNow, watchLook } = pan;
	useEffect(() => {
		const refresh = (look: ReturnType<typeof lookNow>): void => {
			const next = boardsInView(boards, { look, originPx, ...fieldSize.current });
			setInView((was) => (isSameOrder(was, next) ? was : next));
		};
		const field = fieldRef.current;
		const measure = (): void => {
			fieldSize.current = { width: field?.clientWidth ?? 0, height: field?.clientHeight ?? 0 };
		};
		const observer = new ResizeObserver(() => {
			measure();
			refresh(lookNow());
		});

		if (field !== null) {
			observer.observe(field);
		}

		measure();
		refresh(lookNow());
		const unwatch = watchLook((look) => {
			movedAt.current = performance.now();
			refresh(look);
		});
		return () => {
			observer.disconnect();
			unwatch();
		};
	}, [boards, originPx, fieldRef, lookNow, watchLook]);
	useEffect(() => {
		setLoaded((was) => {
			const kept = [...was].filter((id) => inView.includes(id));
			return kept.length === was.size ? was : new Set(kept);
		});
	}, [inView]);
	const onBoardLoaded = useCallback((boardId: string): void => {
		if (boardId === grantedId.current) {
			lastLoadMs.current = performance.now() - grantedAt.current;
		}

		setLoaded((was) => (was.has(boardId) ? was : new Set(was).add(boardId)));
	}, []);
	const grant = useCallback((boardId: string): void => {
		grantedId.current = boardId;
		grantedAt.current = performance.now();
		setLoadingId(boardId);
	}, []);
	const candidate = nextToLoad(inView, loaded);
	useEffect(() => {
		if (candidate === null || candidate === loadingId) {
			return undefined;
		}

		if (lastLoadMs.current < QUICK_LOAD_MS) {
			grant(candidate);
			return undefined;
		}

		let timer = 0;
		let innerFrame = 0;
		const grantWhenStill = (): void => {
			const stillFor = performance.now() - movedAt.current;

			if (stillFor >= STILL_MS) {
				grant(candidate);
				return;
			}

			timer = window.setTimeout(grantWhenStill, STILL_MS - stillFor);
		};
		// TRADE-OFF: a slow board waits for a still camera, so it shows up after the pan; loading it mid-pan froze frames for 2 s
		const outerFrame = window.requestAnimationFrame(() => {
			innerFrame = window.requestAnimationFrame(grantWhenStill);
		});
		return () => {
			window.cancelAnimationFrame(outerFrame);
			window.cancelAnimationFrame(innerFrame);
			window.clearTimeout(timer);
		};
	}, [candidate, loadingId, grant]);
	useEffect(() => {
		if (loadingId === null) {
			return undefined;
		}

		const timer = window.setTimeout(() => onBoardLoaded(loadingId), LOAD_PATIENCE_MS);
		return () => window.clearTimeout(timer);
	}, [loadingId, onBoardLoaded]);
	const liveIds = useMemo(() => liveBoardIds(inView, loaded, loadingId), [inView, loaded, loadingId]);
	return { liveIds, onBoardLoaded };
}
