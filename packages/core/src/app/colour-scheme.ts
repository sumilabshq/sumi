const DARK_SCHEME = "(prefers-color-scheme: dark)";
const DARK_CLASS = "dark";

export function followColourScheme(view: Window = window): () => void {
	const query = view.matchMedia(DARK_SCHEME);
	const applyScheme = (): void => {
		view.document.documentElement.classList.toggle(DARK_CLASS, query.matches);
	};
	applyScheme();
	query.addEventListener("change", applyScheme);
	return () => query.removeEventListener("change", applyScheme);
}
