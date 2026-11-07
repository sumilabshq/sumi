export function sentenceOf(template: string, words: Readonly<Record<string, string>>): string {
	return template.replace(/\{(\w+)\}/g, (placeholder: string, key: string) => words[key] ?? placeholder);
}
