const IPV4 = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/;
const IPV4_MAPPED = /^::ffff:([0-9a-f]{1,4}):[0-9a-f]{1,4}$/;
const UNIQUE_LOCAL = /^f[cd][0-9a-f]{2}:/;
const LINK_LOCAL = /^fe[89ab][0-9a-f]:/;
const LOCAL_NAMES: readonly string[] = ["localhost", ".localhost", ".local"];
const BYTE = 256;

export function isPrivateHost(host: string): boolean {
	if (LOCAL_NAMES.some((name) => host === name || (name.startsWith(".") && host.endsWith(name)))) {
		return true;
	}

	if (host.startsWith("[")) {
		return isPrivateV6(host.slice(1, -1));
	}

	const octets = IPV4.exec(host);

	return octets !== null && isPrivateV4(Number(octets[1]), Number(octets[2]));
}

function isPrivateV6(host: string): boolean {
	if (host === "::1" || host === "::" || UNIQUE_LOCAL.test(host) || LINK_LOCAL.test(host)) {
		return true;
	}

	const mapped = IPV4_MAPPED.exec(host);

	if (mapped === null) {
		return false;
	}

	const high = Number.parseInt(mapped[1] ?? "0", 16);

	return isPrivateV4(Math.floor(high / BYTE), high % BYTE);
}

function isPrivateV4(first: number, second: number): boolean {
	return (
		first === 0 ||
		first === 10 ||
		first === 127 ||
		(first === 169 && second === 254) ||
		(first === 172 && second >= 16 && second <= 31) ||
		(first === 192 && second === 168)
	);
}
