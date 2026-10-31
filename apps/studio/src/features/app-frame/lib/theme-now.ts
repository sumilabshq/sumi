import type { Theme } from "@sumi/contract";

const DARK_SCHEME = "(prefers-color-scheme: dark)";

export function themeNow(): Theme {
	return {
		mode: matchMedia(DARK_SCHEME).matches ? "dark" : "light",
	};
}

export function onThemeChanged(changed: (theme: Theme) => void): () => void {
	const scheme = matchMedia(DARK_SCHEME);
	const told = (): void => changed(themeNow());
	scheme.addEventListener("change", told);
	return () => scheme.removeEventListener("change", told);
}
