import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BROWSER_SHEET_MODULE = "tools/browser-sheet.mts";
const NO_APP_SHEET = "{module} answers no browserSheetsOf(root).app";

// TRADE-OFF: the linked core has no dist, so the shell's own cut of styles.css is run here
export async function writeCoreSheet(shell: string, into: string): Promise<string> {
	const sheetModule = path.join(shell, BROWSER_SHEET_MODULE);
	const loaded: unknown = await import(pathToFileURL(sheetModule).href);
	const sheetsOf: unknown =
		typeof loaded === "object" && loaded !== null ? Reflect.get(loaded, "browserSheetsOf") : null;
	const sheets: unknown = typeof sheetsOf === "function" ? Reflect.apply(sheetsOf, undefined, [shell]) : null;
	const app: unknown = typeof sheets === "object" && sheets !== null ? Reflect.get(sheets, "app") : null;

	if (typeof app !== "string") {
		throw new Error(NO_APP_SHEET.replace("{module}", sheetModule));
	}

	fs.mkdirSync(path.dirname(into), {
		recursive: true,
	});
	fs.writeFileSync(into, app);
	return into;
}
