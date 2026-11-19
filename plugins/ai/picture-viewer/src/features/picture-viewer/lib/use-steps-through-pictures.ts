import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";

export interface PictureSteps {
	readonly at: number;
	readonly layer: RefObject<HTMLDivElement | null>;
	readonly step: (by: number) => void;
	readonly show: (at: number) => void;
	readonly onKeyDown: (event: KeyboardEvent) => void;
}

export interface PictureStepsAsk {
	readonly count: number;
	readonly startAt: number;
	readonly onClose: () => void;
}

export function useStepsThroughPictures({ count, startAt, onClose }: PictureStepsAsk): PictureSteps {
	const [at, setAt] = useState(startAt);
	const layer = useRef<HTMLDivElement>(null);
	const step = (by: number): void => setAt((was) => (was + by + count) % count);
	useEffect(() => layer.current?.focus(), []);

	const onKeyDown = (event: KeyboardEvent): void => {
		if (event.key === "Escape") {
			event.stopPropagation();
			onClose();
			return;
		}

		if (event.key === "ArrowLeft") {
			step(-1);
			return;
		}

		if (event.key === "ArrowRight") {
			step(1);
		}
	};

	return {
		at,
		layer,
		step,
		show: setAt,
		onKeyDown,
	};
}
