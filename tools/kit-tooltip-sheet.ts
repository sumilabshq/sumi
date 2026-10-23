import { readFileSync } from "node:fs";

const KIT_SHEET = "packages/host-obsidian/styles.css";
const TOOLTIP_RULE = /^[^\s{}@][^\n{}]*wg-kit-tooltip[^{]*\{[^}]*\}/gm;
const TOOLTIP_KEYFRAMES = /^@keyframes wg-kit-tooltip[\s\S]*?\n\}/gm;
const TOOLTIP_STILL = /^@media \(prefers-reduced-motion: reduce\) \{\n\t[^\n]*wg-kit-tooltip-host[\s\S]*?\n\}/gm;

export function kitTooltipSheet(): string {
	const sheet = readFileSync(KIT_SHEET, "utf8");
	return [TOOLTIP_KEYFRAMES, TOOLTIP_RULE, TOOLTIP_STILL].flatMap((pattern) => sheet.match(pattern) ?? []).join("\n");
}
