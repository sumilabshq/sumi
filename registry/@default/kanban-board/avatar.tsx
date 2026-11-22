const AVATAR_TONES = [
	{ background: "var(--accent-wash)", color: "var(--interactive-accent)" },
	{ background: "var(--success-wash)", color: "var(--text-success)" },
	{ background: "var(--warning-wash)", color: "var(--warning)" },
	{ background: "var(--error-wash)", color: "var(--text-error)" },
];

export function Avatar({ person }: { person: string }) {
	return (
		<i className="otd-avatar" style={toneForPerson(person)} title={person}>
			{initialsOf(person)}
		</i>
	);
}

function toneForPerson(name: string) {
	let hash = 0;
	for (const letter of String(name)) hash = (hash * 31 + letter.charCodeAt(0)) % 100000;
	return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function initialsOf(name: string): string {
	return String(name)
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((word) => word.charAt(0).toUpperCase())
		.join("");
}
