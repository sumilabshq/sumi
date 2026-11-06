import { z } from "zod";

export const FRAME_COMMAND_KEY = "widgetarium:command-key";

const EDITING_KEYS = new Set(["a", "c", "v", "x", "z", "y"]);
const AFTER_DISPATCH_MS = 0;

export const FrameCommandKeySchema = z.object({
	type: z.literal(FRAME_COMMAND_KEY),
	key: z.string().length(1),
	code: z.string(),
	isTakenByFrame: z.boolean(),
});

export type FrameCommandKey = z.infer<typeof FrameCommandKeySchema>;

export function forwardCommandKeysToParent(here: Window): void {
	if (here.parent === here) {
		return;
	}

	here.addEventListener(
		"keydown",
		(event) => {
			if (!isStudioChord(event)) {
				return;
			}

			here.setTimeout(() => {
				const forwarded: FrameCommandKey = {
					type: FRAME_COMMAND_KEY,
					key: event.key.toLowerCase(),
					code: event.code,
					isTakenByFrame: event.defaultPrevented,
				};
				here.parent.postMessage(forwarded, "*");
			}, AFTER_DISPATCH_MS);
		},
		true,
	);
}

function isStudioChord(event: KeyboardEvent): boolean {
	const isCommandAlone = event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
	return isCommandAlone && event.key.length === 1 && !EDITING_KEYS.has(event.key.toLowerCase());
}
