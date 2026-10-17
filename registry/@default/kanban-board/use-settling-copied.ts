import { useEffect, useState } from "react";

const COPIED_MS = 1400;

export function useSettlingCopied(): readonly [boolean, (isCopied: boolean) => void] {
	const [isCopied, setCopied] = useState(false);

	useEffect(() => {
		if (!isCopied) {
			return undefined;
		}

		const settle = setTimeout(() => setCopied(false), COPIED_MS);
		return () => clearTimeout(settle);
	}, [isCopied]);

	return [isCopied, setCopied];
}
