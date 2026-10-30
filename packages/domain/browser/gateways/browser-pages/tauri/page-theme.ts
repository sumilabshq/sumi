import type { PagesBridge } from "./pages-bridge.js";

const DARK_THEME = "(prefers-color-scheme: dark)";

export function followTheme(bridge: PagesBridge): void {
	const dark = matchMedia(DARK_THEME);
	const wear = (): void =>
		void bridge.wearAppearance(dark.matches).catch((failure: unknown) => {
			console.error("[widgetarium] the browser pages could not follow the theme", failure);
		});
	dark.addEventListener("change", wear);
	wear();
}
