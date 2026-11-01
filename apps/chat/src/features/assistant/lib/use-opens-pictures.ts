import { createElement as h, useRef, useState } from "react";
import type { ReactElement, RefObject } from "react";
import { PictureViewer } from "../ui/turn/picture-viewer.js";
import type { AttachmentChip } from "@widgetarium/assistant";

interface Opened {
	readonly at: number;
	readonly host: HTMLElement;
}

export interface OpensPictures<Holder extends HTMLElement> {
	readonly holder: RefObject<Holder | null>;
	readonly open: (picture: AttachmentChip) => void;
	readonly viewer: ReactElement | null;
}

const TAB_ROOT = ".wg-shell-plate";
const CHAT_ROOT = ".wg-studio-ai";

export function useOpensPictures<Holder extends HTMLElement>(
	pictures: readonly AttachmentChip[],
): OpensPictures<Holder> {
	const holder = useRef<Holder>(null);
	const [opened, setOpened] = useState<Opened | null>(null);
	const shown = pictures.filter(hasPreview);
	const open = (picture: AttachmentChip): void => {
		const from = holder.current;
		const host = from?.closest<HTMLElement>(TAB_ROOT) ?? from?.closest<HTMLElement>(CHAT_ROOT);
		const at = shown.indexOf(picture);

		if (!host || at < 0) {
			return;
		}

		setOpened({
			at,
			host,
		});
	};

	const viewer = opened
		? h(PictureViewer, {
				pictures: shown,
				startAt: opened.at,
				host: opened.host,
				onClose: () => setOpened(null),
			})
		: null;
	return {
		holder,
		open,
		viewer,
	};
}

export function isPicture(chip: AttachmentChip): boolean {
	return chip.kind === "image";
}

export function hasPreview(chip: AttachmentChip): boolean {
	return chip.preview !== null;
}
