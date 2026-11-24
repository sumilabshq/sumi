import { useEffect, useState } from "react";

export interface Lingering {
	readonly isDrawn: boolean;
	readonly isLeaving: boolean;
}

export function useLingering(isOn: boolean, lingerMs: number): Lingering {
	const [isLingering, setIsLingering] = useState(isOn);

	useEffect(() => {
		if (isOn) {
			setIsLingering(true);
			return undefined;
		}

		const timer = setTimeout(() => setIsLingering(false), lingerMs);
		return () => clearTimeout(timer);
	}, [isOn, lingerMs]);

	return { isDrawn: isOn || isLingering, isLeaving: !isOn && isLingering };
}
