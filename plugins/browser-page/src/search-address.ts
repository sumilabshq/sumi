export const SEARCH_ENGINE = "https://duckduckgo.com/?q=";

export function searchAddressOf(text: string): string {
	return `${SEARCH_ENGINE}${encodeURIComponent(text.trim())}`;
}
