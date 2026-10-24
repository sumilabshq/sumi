import { useEffect, useState } from "react";

const TICK_MS = 1000;

export function useTicking(): void {
	const [, tick] = useState(0);
	useEffect(() => {
		const timer = setInterval(() => tick((was) => was + 1), TICK_MS);
		return () => clearInterval(timer);
	}, []);
}
