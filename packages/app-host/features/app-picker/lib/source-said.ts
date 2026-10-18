import type { PickerApp } from "../contract.js";

const SOURCE_SAID: Readonly<Record<PickerApp["kind"], string>> = {
	"built-in": "Built in",
	mine: "You",
	planned: "Later",
};

export function sourceSaidOf(app: PickerApp): string {
	return SOURCE_SAID[app.kind];
}

export function pickerOrderOf(mine: readonly PickerApp[], builtIn: readonly PickerApp[]): readonly PickerApp[] {
	const available = builtIn.filter((app) => app.kind === "built-in");
	const planned = builtIn.filter((app) => app.kind === "planned");
	return [...available, ...mine, ...planned];
}
