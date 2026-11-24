import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import type { PeekHold } from "../../../shared/lib/peek-hold.js";
import { RevealControl } from "./reveal-control.js";

export interface RevealIntent {
	readonly panel: RefObject<HTMLDivElement | null>;
	readonly hold: PeekHold;
	onEnter(): void;
	onLeave(): void;
}

export function useRevealIntent(): RevealIntent {
	const peek = useCommand(appHost.frameSides.peek);
	const conceal = useCommand(appHost.frameSides.conceal);
	const panel = useRef<HTMLDivElement | null>(null);
	const latest = useRef({ peek, conceal });
	latest.current = { peek, conceal };
	const [control] = useState(
		() =>
			new RevealControl({
				peek: () => void latest.current.peek.run({ side: "left" }),
				conceal: () => void latest.current.conceal.run({ side: "left" }),
				isPointerInside: () => panel.current?.matches(":hover") === true,
			}),
	);

	useEffect(() => () => control.dispose(), [control]);

	const hold = useMemo<PeekHold>(() => () => control.hold(), [control]);

	return {
		panel,
		hold,
		onEnter: () => control.enter(),
		onLeave: () => control.leave(),
	};
}
