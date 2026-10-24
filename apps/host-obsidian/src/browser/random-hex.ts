const RANDOM_BYTES = 16;

export function randomHex(): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(RANDOM_BYTES)), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
}
