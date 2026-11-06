import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { Answer } from "@widgetarium/framework";

export type OnAnswered = (answer: Answer<unknown>) => void;

export function useLatestAnswered(onAnswered: OnAnswered): RefObject<OnAnswered> {
	const latest = useRef(onAnswered);
	useEffect(() => {
		latest.current = onAnswered;
	});
	return latest;
}
