import type { PagesBridge } from "./pages-bridge.js";

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

export function followTheme(bridge: PagesBridge): void {
	const darkQuery = matchMedia(DARK_SCHEME_QUERY);
	const wearSystemAppearance = (): void =>
		void bridge.wearAppearance(darkQuery.matches).catch((failure: unknown) => {
			console.error("[widgetarium] the browser pages could not follow the theme", failure);
		});
	darkQuery.addEventListener("change", wearSystemAppearance);
	wearSystemAppearance();
}
