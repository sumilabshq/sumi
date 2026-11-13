import { useEffect, useState } from "react";
import type { RefObject } from "react";

export interface CaretSpot {
	readonly left: number;
	readonly top: number;
}

const ZERO_WIDTH_MARK = "\u200b";

export function useBlockCaret(box: RefObject<HTMLTextAreaElement | null>, draft: string): CaretSpot | null {
	const [spot, setSpot] = useState<CaretSpot | null>(null);

	useEffect(() => {
		const field = box.current;

		if (field === null) {
			return undefined;
		}

		const place = (): void => setSpot(caretSpotOf(field));
		const hide = (): void => setSpot(null);
		const sized = new ResizeObserver(place);
		place();
		sized.observe(field);
		document.addEventListener("selectionchange", place);
		field.addEventListener("focus", place);
		field.addEventListener("scroll", place);
		field.addEventListener("compositionend", place);
		field.addEventListener("blur", hide);
		field.addEventListener("compositionstart", hide);
		return () => {
			sized.disconnect();
			document.removeEventListener("selectionchange", place);
			field.removeEventListener("focus", place);
			field.removeEventListener("scroll", place);
			field.removeEventListener("compositionend", place);
			field.removeEventListener("blur", hide);
			field.removeEventListener("compositionstart", hide);
		};
	}, [box, draft]);

	return spot;
}

function caretSpotOf(field: HTMLTextAreaElement): CaretSpot | null {
	const holder = field.parentElement;
	const isTyping =
		document.activeElement === field && field.value !== "" && field.selectionStart === field.selectionEnd;

	if (holder === null || !isTyping) {
		return null;
	}

	const look = getComputedStyle(field);
	const mirror = document.createElement("div");
	mirror.style.cssText = `position:absolute;visibility:hidden;top:0;left:${field.offsetLeft}px;box-sizing:border-box;width:${field.clientWidth}px;white-space:pre-wrap;overflow-wrap:break-word;font:${look.font};letter-spacing:${look.letterSpacing};padding:${look.padding}`;
	mirror.textContent = field.value.slice(0, field.selectionStart);
	const mark = mirror.appendChild(document.createElement("span"));
	mark.textContent = ZERO_WIDTH_MARK;
	holder.appendChild(mirror);
	const spot = {
		left: field.offsetLeft + mark.offsetLeft,
		top: mark.offsetTop - field.scrollTop,
	};
	mirror.remove();
	return spot;
}
