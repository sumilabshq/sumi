import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { IMAGE_PATH_ATTRIBUTE } from "@widgetarium/markdown";

export interface ImageSpot {
	readonly element: HTMLElement;
	readonly path: string;
	readonly alt: string;
}

const ALT_ATTRIBUTE = "data-image-alt";
const SPOT_SELECTOR = `[${IMAGE_PATH_ATTRIBUTE}]`;

export function useImageSpots(holder: RefObject<HTMLDivElement | null>): readonly ImageSpot[] {
	const [spots, setSpots] = useState<readonly ImageSpot[]>([]);
	useEffect(() => {
		const node = holder.current;

		if (!node) {
			return undefined;
		}

		const collect = (): void => {
			const found = spotsIn(node);
			setSpots((shown) => (isSameSpots(shown, found) ? shown : found));
		};
		const observer = new MutationObserver(collect);
		observer.observe(node, {
			childList: true,
			subtree: true,
		});
		collect();
		return () => observer.disconnect();
	}, [holder]);
	return spots;
}

function spotsIn(node: HTMLElement): readonly ImageSpot[] {
	return [...node.querySelectorAll<HTMLElement>(SPOT_SELECTOR)].map((element) => ({
		element,
		path: element.getAttribute(IMAGE_PATH_ATTRIBUTE) ?? "",
		alt: takenAlt(element),
	}));
}

function takenAlt(element: HTMLElement): string {
	const kept = element.getAttribute(ALT_ATTRIBUTE);

	if (kept !== null) {
		return kept;
	}

	const alt = element.textContent;
	element.setAttribute(ALT_ATTRIBUTE, alt);
	element.replaceChildren();
	return alt;
}

function isSameSpots(shown: readonly ImageSpot[], found: readonly ImageSpot[]): boolean {
	return shown.length === found.length && shown.every((spot, at) => spot.element === found[at]?.element);
}
