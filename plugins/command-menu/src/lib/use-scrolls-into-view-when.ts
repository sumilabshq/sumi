import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export function useScrollsIntoViewWhen(isPicked: boolean): RefObject<HTMLButtonElement | null> {
	const button = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		if (isPicked) {
			button.current?.scrollIntoView({ block: "nearest" });
		}
	}, [isPicked]);
	return button;
}
