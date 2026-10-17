const OFF_UNTIL_SCANNER = "Ink's browser access is off until the widget code scanner ships";

// TODO: lift once .tasks/widget-code-scanner/artifacts/task.md ships
export function refuseInkBrowser(isProductionBuild: boolean): string | null {
	return isProductionBuild ? OFF_UNTIL_SCANNER : null;
}
