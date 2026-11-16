export function copyLink(address: string): void {
	navigator.clipboard.writeText(address).then(
		() => console.info(`[widgetarium] tab link ${JSON.stringify(address)} copied`),
		(failure: unknown) => console.error("[widgetarium] the tab's link could not be copied", failure),
	);
}
