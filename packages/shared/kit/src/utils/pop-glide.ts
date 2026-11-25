import { POPOVER_ITEM } from "../constants/popover";

const GLIDE_ITEM = `${POPOVER_ITEM}, [role^="menuitem"]:not([disabled]), [role="option"]:not([disabled])`;
const DANGER_ITEM = ".is-destructive, [data-variant=\"destructive\"]";

export function followHighlight(panel: HTMLElement): () => void {
	const glide = document.createElement("span");
	glide.className = "wg-kit-pop-glide";
	glide.setAttribute("aria-hidden", "true");
	(panel.querySelector(":scope > .wg-kit-pop-inner") ?? panel).append(glide);
	let target: HTMLElement | null = null;

	const aimAt = (item: HTMLElement | null): void => {
		if (item === target) return;
		const wasHidden = target === null;
		target = item;
		if (item === null) {
			glide.style.opacity = "0";
			return;
		}
		if (wasHidden) glide.style.transition = "none";
		glide.dataset["tone"] = item.matches(DANGER_ITEM) ? "danger" : "";
		const room = glide.offsetParent ?? panel;
		const scale = room instanceof HTMLElement && room.offsetHeight > 0 ? room.getBoundingClientRect().height / room.offsetHeight : 1;
		const box = item.getBoundingClientRect();
		const roomBox = room.getBoundingClientRect();
		const scrolled = room instanceof HTMLElement ? room.scrollTop - room.clientTop : 0;
		glide.style.top = `${(box.top - roomBox.top) / scale + scrolled}px`;
		glide.style.height = `${box.height / scale}px`;
		glide.style.opacity = "1";
		if (wasHidden) {
			void glide.offsetHeight;
			glide.style.transition = "";
		}
	};

	const itemOf = (node: EventTarget | null): HTMLElement | null =>
		node instanceof Element ? node.closest<HTMLElement>(GLIDE_ITEM) : null;

	const onMove = (event: PointerEvent): void => aimAt(itemOf(event.target) ?? target);

	const onFocus = (event: FocusEvent): void => {
		if (!(event.target instanceof Element) || !event.target.matches(":focus-visible")) return;
		aimAt(itemOf(event.target));
	};

	const onLeave = (): void => aimAt(null);

	panel.addEventListener("pointermove", onMove);
	panel.addEventListener("pointerdown", onMove);
	panel.addEventListener("focusin", onFocus);
	panel.addEventListener("pointerleave", onLeave);
	return () => {
		glide.remove();
		panel.removeEventListener("pointermove", onMove);
		panel.removeEventListener("pointerdown", onMove);
		panel.removeEventListener("focusin", onFocus);
		panel.removeEventListener("pointerleave", onLeave);
	};
}
