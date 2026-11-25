import { createContext, useContext, useEffect } from "react";

export type PeekHold = () => () => void;

const NO_RELEASE = (): void => undefined;

export const PeekHoldContext = createContext<PeekHold>(() => NO_RELEASE);

export function usePeekHold(isHeld: boolean): void {
	const hold = useContext(PeekHoldContext);

	useEffect(() => {
		if (!isHeld) {
			return undefined;
		}

		return hold();
	}, [isHeld, hold]);
}
