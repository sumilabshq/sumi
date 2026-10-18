import { useEffect, useState } from "react";
import type { PointerSpot } from "../pointer-spot/pointer-spot.js";

export const LINK_COPIED_MS = 1500;

export interface LinkCopied {
	readonly spot: PointerSpot | null;
	readonly copy: (address: string, spot: PointerSpot) => void;
}

export function useLinkCopied(): LinkCopied {
	const [spot, setSpot] = useState<PointerSpot | null>(null);
	useEffect(() => {
		if (spot === null) {
			return undefined;
		}

		const gone = setTimeout(() => setSpot(null), LINK_COPIED_MS);
		return () => clearTimeout(gone);
	}, [spot]);
	return {
		spot,
		copy: (address, at) => {
			navigator.clipboard.writeText(address).then(
				() => setSpot(at),
				(failure: unknown) => console.error("[widgetarium] the tab's link could not be copied", failure),
			);
		},
	};
}
