// TODO: catalogue off while agents draw on Radix; restore or delete find, list, install, sources
// TRADE-OFF: WIDGETARIUM_CATALOGUE=on keeps the catalogue suites running; a vault setting is the real switch
const CATALOGUE_VERBS: readonly string[] = ["find", "list", "install", "sources"];
const CATALOGUE_OFF =
	"The widget catalogue is switched off. Build every block yourself as a widget of the app's own (brief law 9, components.md).";

export function refuseCatalogueVerb(named: string | undefined): string | null {
	if (named === undefined || !CATALOGUE_VERBS.includes(named)) return null;
	return process.env["WIDGETARIUM_CATALOGUE"] === "on" ? null : CATALOGUE_OFF;
}
