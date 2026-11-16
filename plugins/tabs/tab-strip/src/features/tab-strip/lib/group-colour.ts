const COLOUR_OF_HUE: Readonly<Record<string, string>> = {
	red: "var(--red)",
	orange: "var(--orange)",
	amber: "var(--yellow)",
	green: "var(--green)",
	teal: "var(--cyan)",
	blue: "var(--blue)",
	purple: "var(--purple)",
	pink: "var(--pink)",
};

const NO_HUE = "var(--sumi-text-3)";

export function groupColourOf(hue: string | null): string {
	return hue === null ? NO_HUE : (COLOUR_OF_HUE[hue] ?? NO_HUE);
}
