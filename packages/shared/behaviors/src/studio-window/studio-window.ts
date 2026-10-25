const CORE_PARAM = "core";

export function isCorePage(search: string): boolean {
	return new URLSearchParams(search).has(CORE_PARAM);
}
