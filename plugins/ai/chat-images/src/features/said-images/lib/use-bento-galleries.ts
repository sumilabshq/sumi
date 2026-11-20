import { useEffect } from "react";
import type { RefObject } from "react";
import { FIGURE_CLASS, GALLERY_CLASS } from "@widgetarium/markdown";
import { bentoOf } from "./bento-layout.js";
import type { PictureSize } from "./bento-layout.js";

const BENTO_ATTRIBUTE = "data-bento";
const SMALL_ATTRIBUTE = "data-bento-small";

export function useBentoGalleries(holder: RefObject<HTMLDivElement | null>): void {
	useEffect(() => {
		const node = holder.current;

		if (!node) {
			return undefined;
		}

		const arrange = (): void => {
			for (const gallery of node.querySelectorAll<HTMLElement>(`.${GALLERY_CLASS}`)) {
				arrangeGallery(gallery);
			}
		};
		const mutations = new MutationObserver(arrange);
		mutations.observe(node, { childList: true, subtree: true });
		const resizes = new ResizeObserver(arrange);
		resizes.observe(node);
		node.addEventListener("load", arrange, true);
		arrange();
		return () => {
			mutations.disconnect();
			resizes.disconnect();
			node.removeEventListener("load", arrange, true);
		};
	}, [holder]);
}

function arrangeGallery(gallery: HTMLElement): void {
	const figures = [...gallery.children].filter((child): child is HTMLElement => child.classList.contains(FIGURE_CLASS));
	const sizes = figures.map(naturalSizeOf);

	if (figures.length < 2 || !sizes.every((size): size is PictureSize => size !== null)) {
		return;
	}

	const gap = Number.parseFloat(getComputedStyle(gallery).columnGap) || 0;
	gallery.setAttribute(BENTO_ATTRIBUTE, "");
	const layout = bentoOf(sizes, gallery.clientWidth, gap);
	gallery.style.height = `${String(layout.height)}px`;
	figures.forEach((figure, at) => {
		const tile = layout.tiles[at];

		if (tile === undefined) {
			return;
		}

		figure.style.left = `${String(tile.x)}px`;
		figure.style.top = `${String(tile.y)}px`;
		figure.style.width = `${String(tile.width)}px`;
		figure.style.height = `${String(tile.height)}px`;
		figure.toggleAttribute(SMALL_ATTRIBUTE, tile.isSmall);
	});
}

function naturalSizeOf(figure: HTMLElement): PictureSize | null {
	const image = figure.querySelector("img");
	return image !== null && image.naturalWidth > 0 ? { width: image.naturalWidth, height: image.naturalHeight } : null;
}
