import { useState } from "react";

const MOST_RECENT = 2;

export function useRecentFonts(role: string): readonly [readonly string[], (family: string) => void] {
	const key = `sumi-recent-fonts-${role}`;
	const [recent, setRecent] = useState<readonly string[]>(
		() => JSON.parse(window.localStorage.getItem(key) ?? "[]") as string[],
	);
	return [
		recent,
		(family) => {
			const next = [family, ...recent.filter((one) => one !== family)].slice(0, MOST_RECENT);
			window.localStorage.setItem(key, JSON.stringify(next));
			setRecent(next);
		},
	];
}
