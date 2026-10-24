export async function copyText(text: string): Promise<boolean> {
	try {
		await window.navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}
