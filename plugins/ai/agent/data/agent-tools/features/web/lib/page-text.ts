const HIDDEN_BLOCKS = /<(script|style|noscript|svg|head)\b[\s\S]*?<\/\1>/gi;
const COMMENTS = /<!--[\s\S]*?-->/g;
const BLOCK_ENDS = /<\/?(p|div|br|li|tr|h[1-6]|section|article|header|footer|pre|blockquote)\b[^>]*>/gi;
const TAGS = /<[^>]+>/g;
const SPACES = /[ \t\f\v\r]+/g;
const BLANK_RUNS = /\n\s*\n+/g;
const NAMED_ENTITIES: Readonly<Record<string, string>> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
};
const ENTITY = /&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi;
const HTML_MARK = /<html|<body|<div|<p[\s>]/i;

export function pageTextOf(body: string): string {
	if (!HTML_MARK.test(body)) {
		return body;
	}

	const text = body
		.replace(HIDDEN_BLOCKS, "")
		.replace(COMMENTS, "")
		.replace(BLOCK_ENDS, "\n")
		.replace(TAGS, "")
		.replace(ENTITY, (whole, name: string) => entityOf(name) ?? whole);
	return text
		.split("\n")
		.map((line) => line.replace(SPACES, " ").trim())
		.join("\n")
		.replace(BLANK_RUNS, "\n\n")
		.trim();
}

function entityOf(name: string): string | null {
	const lower = name.toLowerCase();

	if (lower.startsWith("#x")) {
		return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
	}

	if (lower.startsWith("#")) {
		return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
	}

	return NAMED_ENTITIES[lower] ?? null;
}
