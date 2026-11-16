import { createElement as h, Fragment } from "react";
import type { ReactElement, ReactNode } from "react";
import { usePinActs } from "../../lib/use-pin-acts.js";
import { usePins } from "../../lib/use-pins.js";
import { PinEnd } from "../pin-end/pin-end.js";

export interface PinnedEndProps {
	readonly tabId: string;
	readonly children: ReactNode;
}

export function PinnedEnd({ tabId, children }: PinnedEndProps): ReactElement {
	const acts = usePinActs();
	const isPinned = usePins().some(({ id }) => id === tabId);
	return isPinned ? <PinEnd onUnpin={() => acts.unpin(tabId)} /> : <>{children}</>;
}
