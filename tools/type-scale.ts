import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const TYPE_SCALE_PX: readonly number[] = [11, 12, 13, 14, 16, 22];
export const TYPE_SCALE_ROOTS: readonly string[] = ["plugins", "apps/studio/src", "packages/shared/kit"];
export const TYPE_TOKEN_ROOTS: readonly string[] = ["design-systems", "packages/shared/core", "packages/shared/kit"];

const SKIPPED_FOLDERS = new Set(["node_modules", "dist", "generated", "target", "data", "tests"]);
const SIZE_DECLARATION = /(?<![\w-])font(?:-size)?\s*:\s*([^;}\n`]+)/g;
const SIZE_IN_SHORTHAND = /var\(--fs-[\w-]+(?:\s*,[^)]*)?\)|var\(--[\w-]+\)|[\d.]+(?:px|r?em|%)/;
const SCALE_VALUE = new RegExp(`^var\\(--fs-(?:${TYPE_SCALE_PX.join("|")})\\)$`);
const KEPT_VALUES = new Set(["inherit", "var(--code-size)", "unset", "initial"]);
const ALLOWED_EXCEPTIONS: readonly { file: string; value: string }[] = [
	{ file: "canvas-page.css", value: "calc(12px / var(--canvas-zoom, 1))" },
];
const TOKEN_DECLARATION =
	/^\s*(--(?:fs-[\w-]+|type-(?:xs|s|m|l)|text-(?:xs|s|m|l)|font-ui-(?:small|smaller|medium|large)|h[1-6]-size[\w-]*)):\s*([^;]+);/gm;

export function typeScaleFilesUnder(roots: readonly string[], extensions: RegExp): readonly string[] {
	return roots.flatMap((root) => filesUnder(root)).filter((file) => extensions.test(file) && !file.endsWith(".d.ts"));
}

function filesUnder(folder: string): readonly string[] {
	return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
		if (entry.isDirectory()) {
			return SKIPPED_FOLDERS.has(entry.name) ? [] : filesUnder(path.join(folder, entry.name));
		}

		return [path.join(folder, entry.name)];
	});
}

export function fontSizeRefusalsOf(file: string, text: string): readonly string[] {
	return [...text.matchAll(SIZE_DECLARATION)].flatMap((match) => {
		const declaration = match[0].trimStart().startsWith("font-size") ? "font-size" : "font";
		const value = sizeOf(declaration, match[1].trim().replace(/\s*!important$/, ""));
		if (value === undefined || isOnScale(value) || isAllowedException(file, value)) {
			return [];
		}

		const line = text.slice(0, match.index).split("\n").length;
		return [`${file}:${line} font-size: ${value} is not a scale token`];
	});
}

function sizeOf(declaration: string, value: string): string | undefined {
	if (declaration === "font-size") {
		return value;
	}

	if (KEPT_VALUES.has(value) || (!/\//.test(value) && !SIZE_IN_SHORTHAND.test(value))) {
		return undefined;
	}

	const found = SIZE_IN_SHORTHAND.exec(value.replace(/var\(--(?:fw|font)-[\w-]+(?:\s*,[^)]*)?\)/g, ""));
	return found?.[0];
}

function isOnScale(value: string): boolean {
	return SCALE_VALUE.test(value) || KEPT_VALUES.has(value);
}

function isAllowedException(file: string, value: string): boolean {
	return ALLOWED_EXCEPTIONS.some((entry) => file.endsWith(entry.file) && value === entry.value);
}

export function scaleTokenRefusalsOf(file: string, text: string): readonly string[] {
	return [...text.matchAll(TOKEN_DECLARATION)].flatMap((match) => {
		const [, name, value] = match;
		const line = text.slice(0, match.index).split("\n").length;
		const named = /^--fs-(\d+)$/.exec(name);
		if (
			name.startsWith("--fs-") &&
			(!named || !TYPE_SCALE_PX.includes(Number(named[1])) || value.trim() !== `${named[1]}px`)
		) {
			return [`${file}:${line} ${name}: ${value.trim()} is not a scale token whose value equals its name`];
		}

		if (!name.startsWith("--fs-") && offScale(value)) {
			return [`${file}:${line} ${name}: ${value.trim()} resolves outside the scale`];
		}

		return [];
	});
}

function offScale(value: string): boolean {
	const sizes = [...value.matchAll(/([\d.]+)(px|r?em|%)/g)];
	return sizes.some(([, amount, unit]) => unit !== "px" || !TYPE_SCALE_PX.includes(Number(amount)));
}

export function typeScaleRefusals(): readonly string[] {
	const sizes = typeScaleFilesUnder(TYPE_SCALE_ROOTS, /\.(css|tsx?)$/).flatMap((file) =>
		fontSizeRefusalsOf(file, readFileSync(file, "utf8")),
	);
	const tokens = typeScaleFilesUnder(TYPE_TOKEN_ROOTS, /\.css$/).flatMap((file) =>
		scaleTokenRefusalsOf(file, readFileSync(file, "utf8")),
	);
	return [...sizes, ...tokens];
}
