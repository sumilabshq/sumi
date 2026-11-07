import { createContext, useContext } from "react";
import type { WindowOffers } from "@sumi/sumi-host-plugin";

export const WindowOffersContext = createContext<WindowOffers | null>(null);

const NO_OFFERS = "a tab page drew outside a studio window, which lends the offers its modules start from";

export function useWindowOffers(): WindowOffers {
	const offers = useContext(WindowOffersContext);

	if (offers === null) {
		throw new Error(NO_OFFERS);
	}

	return offers;
}
