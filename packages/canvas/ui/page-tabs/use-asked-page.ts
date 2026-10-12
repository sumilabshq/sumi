import { useEffect, useState } from "react";

export function useAskedPage(page: string): readonly [string | null, (asked: string | null) => void] {
	const [asked, setAsked] = useState<string | null>(null);
	useEffect(() => setAsked(null), [page]);
	return [asked, setAsked];
}
