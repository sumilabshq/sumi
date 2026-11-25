import { useCallback, useRef } from "react";
import { haptics } from "@sumi/contract";
import { useRuntime } from "@widgetarium/data-framework";

const TAP_GAP_MS = 40;
const NOT_TAPPED = "[flows-sidebar] haptic tap: none → refused ({reason})";

export function useHapticTap(): () => void {
	const runtime = useRuntime("useHapticTap");
	const lastAt = useRef(Number.NEGATIVE_INFINITY);
	return useCallback(() => {
		const now = performance.now();

		if (now - lastAt.current < TAP_GAP_MS || runtime.routes.cannotRun(haptics.haptics.tap) !== null) {
			return;
		}

		lastAt.current = now;
		runtime
			.send(haptics.haptics.tap, { pattern: "alignment" }, { idempotencyKey: crypto.randomUUID() })
			.then((answer) => {
				if (!answer.ok) {
					console.warn(NOT_TAPPED.replace("{reason}", answer.reason));
				}
			})
			.catch((thrown: unknown) => console.error(NOT_TAPPED.replace("{reason}", String(thrown)), thrown));
	}, [runtime]);
}
