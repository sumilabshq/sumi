import { useEffect } from "react";
import type { RefObject } from "react";
import { FrameCommandKeySchema } from "@widgetarium/framework";

const TAKEN = "[widgetarium] key ⌘{key} in app {app} frame → kept by the app (it handled the key itself)";
const REPLAYED = "[widgetarium] key ⌘{key} in app {app} frame → studio";

export function useReplaysFrameKeys(frame: RefObject<HTMLIFrameElement | null>, app: string): void {
	useEffect(() => {
		const replay = ({ source, data }: MessageEvent): void => {
			const frameWindow = frame.current?.contentWindow ?? null;
			const pressed = FrameCommandKeySchema.safeParse(data);

			if (frameWindow === null || source !== frameWindow || !pressed.success) {
				return;
			}

			const { key, code, isTakenByFrame } = pressed.data;
			const said = (line: string): string => line.replace("{key}", key.toUpperCase()).replace("{app}", app);

			if (isTakenByFrame) {
				console.info(said(TAKEN));
				return;
			}

			console.info(said(REPLAYED));
			window.dispatchEvent(
				new KeyboardEvent("keydown", {
					key,
					code,
					metaKey: true,
					bubbles: true,
					cancelable: true,
				}),
			);
		};
		window.addEventListener("message", replay);
		return () => window.removeEventListener("message", replay);
	}, [frame, app]);
}
