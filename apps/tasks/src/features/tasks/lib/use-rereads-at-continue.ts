import { useEffect } from "react";
import { BoardQuery, TaskQuery, TasksQuery } from "@widgetarium/tasks";
import type { TaskCard } from "@widgetarium/tasks";
import { useApp } from "@widgetarium/data-framework";

const REREAD = [BoardQuery, TaskQuery, TasksQuery];

export function useRereadsAtContinue(cards: readonly TaskCard[]): void {
	const { queryClient } = useApp("useRereadsAtContinue");
	const earliest = earliestContinueOf(cards);
	useEffect(() => {
		if (earliest === null) {
			return undefined;
		}

		const timer = setTimeout(
			() => {
				console.info(
					`[tasks] usage limit reset at ${new Date(earliest).toISOString()}: continue waits → continue allowed, the board is read again`,
				);
				REREAD.forEach((query) => void queryClient.invalidateQueries({ queryKey: [query.name] }));
			},
			Math.max(0, earliest - Date.now()),
		);
		return () => clearTimeout(timer);
	}, [earliest, queryClient]);
}

function earliestContinueOf(cards: readonly TaskCard[]): number | null {
	const waiting = cards.flatMap((card) => (card.continueAt === null ? [] : [card.continueAt]));
	return waiting.length === 0 ? null : Math.min(...waiting);
}
