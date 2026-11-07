import { useEffect, useState } from "react";

export function useLatchesTrue(flag: boolean): boolean {
	const [hasBeenTrue, setHasBeenTrue] = useState(flag);
	useEffect(() => {
		if (flag) {
			setHasBeenTrue(true);
		}
	}, [flag]);
	return hasBeenTrue || flag;
}
