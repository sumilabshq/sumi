const SECRET_IN_CONTENT = "secret-in-content";
const DIGIT_GROUPS = /(?<!\d)\d{3,19}(?:[\s-]\d{3,19}){0,7}(?!\d)/g;
const IBAN_GROUPS = /(?<![A-Za-z0-9])[A-Za-z]{2}\d{2}[A-Za-z0-9]{0,30}(?:\s[A-Za-z0-9]{1,4}){0,9}/g;
const GROUP_BREAK = /[\s-]+/;
const CARD_DIGITS = {
	least: 13,
	most: 19,
};
const CARD_LEAD_GROUP = 4;
const CARD_GROUP = {
	least: 3,
	most: 6,
};
const IBAN_LENGTH = {
	least: 15,
	most: 34,
};
const IBAN_REMAINDER = 97n;
const LETTER_OFFSET = 55;
const TOKEN_SHAPES: readonly RegExp[] = [
	/(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{20,}/,
	/(?<![A-Za-z0-9])[sr]k_(?:live|test)_[A-Za-z0-9]{16,}/,
	/(?<![A-Za-z0-9])gh[pousr]_[A-Za-z0-9]{36}/,
	/(?<![A-Za-z0-9])github_pat_[A-Za-z0-9_]{22,}/,
	/(?<![A-Za-z0-9])glpat-[A-Za-z0-9_-]{20,}/,
	/(?<![A-Za-z0-9])A(?:KIA|SIA)[0-9A-Z]{16}(?![0-9A-Z])/,
	/(?<![A-Za-z0-9])AIza[0-9A-Za-z_-]{35}/,
	/(?<![A-Za-z0-9])xox[bp]-[A-Za-z0-9-]{10,}/,
	/(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,
	/-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/,
];

export function refuseSecretContent(text: string): string | null {
	const isSecret = hasTokenShape(text) || hasCardNumber(text) || hasIban(text);

	return isSecret ? SECRET_IN_CONTENT : null;
}

function hasTokenShape(text: string): boolean {
	return TOKEN_SHAPES.some((shape) => shape.test(text));
}

function hasCardNumber(text: string): boolean {
	return [...text.matchAll(DIGIT_GROUPS)].some(([found]) => groupRunsOf(found.split(GROUP_BREAK)).some(isCardNumber));
}

function hasIban(text: string): boolean {
	return [...text.matchAll(IBAN_GROUPS)].some(([found]) =>
		groupPrefixesOf(found.toUpperCase().split(GROUP_BREAK)).some(passesIbanChecksum),
	);
}

function groupRunsOf(groups: readonly string[]): readonly (readonly string[])[] {
	return groups.flatMap((_, from) => groups.slice(from).map((_one, length) => groups.slice(from, from + length + 1)));
}

function groupPrefixesOf(groups: readonly string[]): readonly string[] {
	return groups.map((_, at) => groups.slice(0, at + 1).join(""));
}

function isCardNumber(run: readonly string[]): boolean {
	const digits = run.join("");
	const isLaidOut = run.length === 1 || run.every((group, at) => isCardGroup(group, at));

	return digits.length >= CARD_DIGITS.least && digits.length <= CARD_DIGITS.most && isLaidOut && passesLuhn(digits);
}

function isCardGroup(group: string, at: number): boolean {
	if (at === 0) {
		return group.length === CARD_LEAD_GROUP;
	}

	return group.length >= CARD_GROUP.least && group.length <= CARD_GROUP.most;
}

function passesLuhn(digits: string): boolean {
	const sum = [...digits].reverse().reduce((total, digit, at) => total + luhnValueOf(Number(digit), at), 0);

	return sum % 10 === 0;
}

function luhnValueOf(digit: number, at: number): number {
	if (at % 2 === 0) {
		return digit;
	}

	return digit * 2 > 9 ? digit * 2 - 9 : digit * 2;
}

function passesIbanChecksum(iban: string): boolean {
	if (iban.length < IBAN_LENGTH.least || iban.length > IBAN_LENGTH.most) {
		return false;
	}

	const moved = `${iban.slice(4)}${iban.slice(0, 4)}`;
	const numeric = [...moved]
		.map((sign) => (/\d/.test(sign) ? sign : String(sign.charCodeAt(0) - LETTER_OFFSET)))
		.join("");

	return BigInt(numeric) % IBAN_REMAINDER === 1n;
}
