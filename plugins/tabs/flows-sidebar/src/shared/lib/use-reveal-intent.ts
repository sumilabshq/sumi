import { useEffect, useMemo, useRef, useState } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import type { PeekHold } from "./peek-hold.js";
import { RevealControl } from "./reveal-control.js";
import { isPointerInRevealZone } from "./reveal-zone.js";

export interface RevealIntent {
	readonly hold: PeekHold;
	onEnter(): void;
	onLeave(): void;
}

export function useRevealIntent(): RevealIntent {
	const peek = useCommand(appHost.frameSides.peek);
	const conceal = useCommand(appHost.frameSides.conceal);
	const latest = useRef({ peek, conceal });
	latest.current = { peek, conceal };
	const [control] = useState(
		() =>
			new RevealControl({
				peek: () => void latest.current.peek.run({ side: "left" }),
				conceal: () => void latest.current.conceal.run({ side: "left" }),
				isPointerInside: isPointerInRevealZone,
			}),
	);

	useEffect(() => () => control.dispose(), [control]);

	const hold = useMemo<PeekHold>(() => () => control.hold(), [control]);

	return {
		hold,
		onEnter: () => control.enter(),
		onLeave: () => control.leave(),
	};
}
