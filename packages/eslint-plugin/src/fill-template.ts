export function fillTemplate(template: string, data: Readonly<Record<string, string>>): string {
	return Object.entries(data).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
}
