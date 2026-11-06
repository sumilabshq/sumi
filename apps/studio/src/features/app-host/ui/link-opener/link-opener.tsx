import { useEffect } from "react";
import type { RefObject } from "react";
import { OpenLinkCommand } from "@widgetarium/app-host";
import { useCommand } from "@widgetarium/data-framework";
import { PRESSED_EVENTS, linkPressOf } from "../../lib/link-presses/link-press.js";

export interface LinkOpenerProps {
	readonly frame: RefObject<HTMLElement | null>;
}

const CAPTURE = { capture: true } as const;

export function LinkOpener({ frame }: LinkOpenerProps): null {
	const { run: openLink } = useCommand(OpenLinkCommand);

	useEffect(() => {
		const holder = frame.current;
		const view = holder?.ownerDocument.defaultView ?? null;

		if (holder === null || view === null) {
			return;
		}

		const pressed = (event: MouseEvent): void => {
			const press = linkPressOf(event, view);

			if (press === null) {
				return;
			}

			event.preventDefault();
			void openLink(press);
		};
		// TODO: OS-level sumi:// links need tauri-plugin-deep-link, a new cargo dependency.
		PRESSED_EVENTS.forEach((type) => holder.addEventListener(type, pressed, CAPTURE));
		return () => PRESSED_EVENTS.forEach((type) => holder.removeEventListener(type, pressed, CAPTURE));
	}, [frame, openLink]);
	return null;
}
