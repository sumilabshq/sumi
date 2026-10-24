const ADDRESS_LIKE = /^(https?:\/\/)?(localhost(:\d+)?|[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,})(:\d+)?(\/\S*)?$/i;
const SCHEME = /^https?:\/\//i;
const TRAILING_SLASH = /\/$/;

export function isAddressLike(text: string): boolean {
	return ADDRESS_LIKE.test(text.trim());
}

export function bareAddressOf(address: string): string {
	return address.trim().replace(SCHEME, "").replace(TRAILING_SLASH, "");
}

export function hostOf(address: string): string {
	return bareAddressOf(address).split("/")[0]?.toLowerCase() ?? "";
}
