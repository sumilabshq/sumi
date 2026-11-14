export interface BackgroundChoice {
	readonly label: string;
	readonly value: string | null;
}

export const BACKGROUND_CHOICES: readonly BackgroundChoice[] = [
	{
		label: "Theme",
		value: null,
	},
	{
		label: "Black",
		value: "#000000",
	},
	{
		label: "Graphite",
		value: "#1e1e1e",
	},
	{
		label: "Paper",
		value: "#f5f5f0",
	},
	{
		label: "White",
		value: "#ffffff",
	},
];

export const CUSTOM_BACKGROUND = "Custom colour";

export function pickColor(initial: string | null): Promise<string | null> {
	return new Promise((settle) => {
		const field = document.createElement("input");
		field.type = "color";
		field.value = initial ?? BACKGROUND_CHOICES[1]?.value ?? "";
		field.style.position = "fixed";
		field.style.opacity = "0";
		field.style.pointerEvents = "none";
		field.addEventListener("change", () => {
			settle(field.value);
			field.remove();
		});
		field.addEventListener("cancel", () => {
			settle(null);
			field.remove();
		});
		document.body.append(field);
		field.click();
	});
}
