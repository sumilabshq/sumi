export interface PageColours {
	readonly theme: string | null;
	readonly page: string | null;
	readonly canvas: string;
	readonly isPatterned: boolean;
	readonly topIsPicture: boolean;
}

export function wantsStrip(colours: PageColours): boolean {
	return colours.theme === null && (colours.isPatterned || colours.topIsPicture);
}

export function pageFillOf(colours: PageColours, sampled: string | null): string {
	if (colours.theme !== null) {
		return colours.theme;
	}

	if (wantsStrip(colours) && sampled !== null) {
		return sampled;
	}

	return colours.page ?? colours.canvas;
}
