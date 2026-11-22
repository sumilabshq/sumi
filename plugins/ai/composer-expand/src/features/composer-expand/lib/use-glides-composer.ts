import { useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { revealCaret } from "./caret-reveal.js";
import { heightAtRest } from "./height-at-rest.js";
import { holdChatScroll, releaseChatScroll } from "./scroll-hold.js";

const GLIDE_MS = 180;
const GLIDE_EASING = "cubic-bezier(0.2, 0, 0, 1)";

export interface Glided {
	readonly composer: RefObject<HTMLDivElement | null>;
	readonly box: RefObject<HTMLTextAreaElement | null>;
	readonly isExpanded: boolean;
	readonly fitBox: () => void;
	readonly frame: RefObject<HTMLDivElement | null>;
}

export function useGlidesComposer({ composer, box, isExpanded, fitBox, frame }: Glided): () => void {
	const shownHeight = useShownHeight(composer);
	const wasExpanded = useRef(isExpanded);
	useLayoutEffect(() => {
		const node = composer.current;
		const field = box.current;
		const chatFrame = frame.current;

		if (wasExpanded.current === isExpanded) {
			return undefined;
		}

		wasExpanded.current = isExpanded;

		if (!node || !field || !chatFrame) {
			return undefined;
		}

		holdChatScroll(chatFrame);

		const from = shownHeight.current;
		node.getAnimations().forEach((running) => running.cancel());
		fitBox();
		const to = heightAtRest(node);
		const glide = node.animate(
			[
				{ height: `${from}px`, flexGrow: 0, flexShrink: 0, flexBasis: "auto" },
				{ height: `${to}px`, flexGrow: 0, flexShrink: 0, flexBasis: "auto" },
			],
			{ duration: prefersLessMotion() ? 0 : GLIDE_MS, easing: GLIDE_EASING },
		);
		let nextFrame = requestAnimationFrame(function follow() {
			revealCaret(field);
			nextFrame = requestAnimationFrame(follow);
		});
		const stop = (): void => {
			cancelAnimationFrame(nextFrame);
			revealCaret(field);

			if (!isExpanded) {
				releaseChatScroll(chatFrame);
			}
		};
		glide.finished.then(stop, () => cancelAnimationFrame(nextFrame));
		return () => cancelAnimationFrame(nextFrame);
	}, [composer, box, isExpanded, fitBox, frame, shownHeight]);
	return () => {
		shownHeight.current = composer.current?.getBoundingClientRect().height ?? shownHeight.current;
	};
}

function useShownHeight(composer: RefObject<HTMLDivElement | null>): RefObject<number> {
	const shownHeight = useRef(0);
	useEffect(() => {
		const node = composer.current;

		if (!node || typeof ResizeObserver !== "function") {
			return undefined;
		}

		shownHeight.current = node.getBoundingClientRect().height;
		const sizes = new ResizeObserver(() => {
			shownHeight.current = node.getBoundingClientRect().height;
		});
		sizes.observe(node);
		return () => sizes.disconnect();
	}, [composer]);
	return shownHeight;
}

function prefersLessMotion(): boolean {
	return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
