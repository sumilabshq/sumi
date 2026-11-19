import { useCallback, useEffect, useRef, useState } from "react";
import type { PaneLeaf } from "@widgetarium/app-host/contract";

export interface PaneExpanding {
	readonly expandedId: string | null;
	readonly isEasing: boolean;
	readonly toggle: (paneId: string) => void;
}

const EXPAND_EASE_MS = 260;

export function usePaneExpanding(leaves: readonly PaneLeaf[]): PaneExpanding {
	const [askedId, setAskedId] = useState<string | null>(null);
	const [isEasing, setEasing] = useState(false);
	const easeEnd = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	useEffect(() => () => clearTimeout(easeEnd.current), []);
	const toggle = useCallback((paneId: string) => {
		clearTimeout(easeEnd.current);
		setEasing(true);
		easeEnd.current = setTimeout(() => setEasing(false), EXPAND_EASE_MS);
		setAskedId((was) => {
			const now = was === paneId ? null : paneId;
			console.info(`[widgetarium] pane expanded ${was ?? "none"} → ${now ?? "none"}`);
			return now;
		});
	}, []);
	return {
		expandedId: leaves.some((leaf) => leaf.id === askedId) ? askedId : null,
		isEasing,
		toggle,
	};
}
