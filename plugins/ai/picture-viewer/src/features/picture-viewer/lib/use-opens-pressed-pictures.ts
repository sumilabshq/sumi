import { useEffect, useState } from "react";
import { pressedPicturesOf } from "./pressed-pictures.js";
import type { PressedPictures } from "./pressed-pictures.js";

export interface OpenedPictures {
	readonly opened: PressedPictures | null;
	readonly close: () => void;
}

export function useOpensPressedPictures(): OpenedPictures {
	const [opened, setOpened] = useState<PressedPictures | null>(null);
	useEffect(() => {
		const open = (event: MouseEvent): void => {
			if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
				return;
			}

			const pressed = pressedPicturesOf(event.target);

			if (pressed === null) {
				return;
			}

			event.preventDefault();
			setOpened(pressed);
		};
		document.addEventListener("click", open);
		return () => document.removeEventListener("click", open);
	}, []);
	return {
		opened,
		close: () => setOpened(null),
	};
}
