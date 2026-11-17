import { useEffect, useState } from "react";

export function useLingering(isOn: boolean, lingerMs: number): boolean {
	const [isLingering, setLingering] = useState(false);
	useEffect(() => {
		if (isOn) {
			setLingering(true);
			return undefined;
		}

		const ending = setTimeout(() => setLingering(false), lingerMs);
		return () => clearTimeout(ending);
	}, [isOn, lingerMs]);
	return isOn || isLingering;
}
