import { useEffect, useState } from "react";

const COPIED_MS = 1400;

export function useCopiedFlag(): readonly [boolean, () => void] {
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), COPIED_MS);
		return () => clearTimeout(timer);
	}, [copied]);
	return [copied, () => setCopied(true)];
}
