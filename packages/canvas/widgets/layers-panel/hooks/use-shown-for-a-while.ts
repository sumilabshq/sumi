import { useEffect, useState } from "react";

const SHOWN_MS = 5000;

export function useShownForAWhile(): [string | null, (said: string | null) => void] {
	const [said, setSaid] = useState<string | null>(null);
	useEffect(() => {
		if (!said) return;
		const timer = window.setTimeout(() => setSaid(null), SHOWN_MS);
		return () => window.clearTimeout(timer);
	}, [said]);
	return [said, setSaid];
}
