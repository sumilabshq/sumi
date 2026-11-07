const ONLY_SHELL = "the app {app} cannot {what}: only the shell does";

export function onlyShellReasonOf(app: string, what: string): string {
	return ONLY_SHELL.replace("{app}", app).replace("{what}", what);
}
