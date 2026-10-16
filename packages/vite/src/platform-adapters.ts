import { readFile } from "node:fs/promises";

export interface PlatformBuild {
	readonly define: Readonly<Record<string, string>>;
	readonly isStoodIn: (path: string) => boolean;
	readonly standInOf: (path: string) => Promise<string>;
}

interface StandInAsk {
	readonly path: string;
	readonly source: string;
	readonly built: string;
}

const PLATFORM_ADAPTER = /\/adapters\/[^/]+\/(obsidian|web|mobile|desktop|server)(?:\/\1)?\.adapter\.[jt]sx?$/;
const DOMAIN_SERVER_FILE = /\/packages\/[^/]+\/server\//;
const SERVER = "server";
const EXPORTED_VALUE =
	/^export\s+(?:abstract\s+|async\s+)?(class|function|const|let)\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+handlerOf\(\s*([A-Za-z_$][\w$]*)\s*\))?/gm;
const RE_EXPORTED = /^export\s*\{([^}]*)\}\s*from\s*"[^"]+"/gm;
const NAMED_IMPORT = /^import\s*\{([^}]*)\}\s*from\s*("[^"]+")/gm;
const NOT_BUILT = "{file} belongs to the {platform} build, and this build is for {built}";
const REFUSING = [
	"const refuse = () => { throw new Error(NOT_BUILT); };",
	"const standIn = () => new Proxy(function () {}, { get: refuse, set: refuse, has: refuse, apply: refuse, construct: refuse });",
];

export function platformBuildOf(built: string): PlatformBuild {
	return {
		define: { __WG_PLATFORM__: JSON.stringify(built) },
		isStoodIn: (path) => isOfOtherPlatform(path, built),
		standInOf: async (path) => standInSourceOf({ path, source: await readFile(path, "utf8"), built }),
	};
}

function platformOfFile(path: string): string | null {
	const slashed = path.split("\\").join("/");
	const adapter = PLATFORM_ADAPTER.exec(slashed)?.[1];
	if (adapter !== undefined) return adapter;
	return DOMAIN_SERVER_FILE.test(slashed) ? SERVER : null;
}

function isOfOtherPlatform(path: string, built: string): boolean {
	const platform = platformOfFile(path);
	return platform !== null && platform !== built;
}

function standInSourceOf({ path, source, built }: StandInAsk): string {
	const said = NOT_BUILT.replace("{file}", path.split("/").slice(-3).join("/"))
		.replace("{platform}", platformOfFile(path) ?? built)
		.replace("{built}", built);
	const exported = [...source.matchAll(EXPORTED_VALUE)];
	const requests = exported.flatMap(([, , , request]) => (request === undefined ? [] : [request]));
	const lines = [
		...exported.map(([, kind = "", name = "", request]) => standInExportOf(kind, name, request)),
		...reExportedNamesOf(source).map((name) => `export const ${name} = standIn();`),
	];
	return [...importsOf(source, requests), `const NOT_BUILT = ${JSON.stringify(said)};`, ...REFUSING, ...lines].join(
		"\n",
	);
}

function standInExportOf(kind: string, name: string, request: string | undefined): string {
	if (request !== undefined)
		return `export class ${name} { static request = ${request}; static isMadeByHandlerOf = true; constructor() { refuse(); } }`;
	if (kind === "class") return `export class ${name} { constructor() { refuse(); } }`;
	if (kind === "function") return `export function ${name}() { refuse(); }`;
	return `export const ${name} = standIn();`;
}

function reExportedNamesOf(source: string): string[] {
	return [...source.matchAll(RE_EXPORTED)].flatMap(([, listed = ""]) =>
		listed
			.split(",")
			.map((name) => name.trim())
			.filter((name) => name !== "" && !name.startsWith("type "))
			.map((name) => name.split(/\s+as\s+/).pop() ?? name),
	);
}

function importsOf(source: string, names: readonly string[]): string[] {
	return [...source.matchAll(NAMED_IMPORT)].flatMap(([, listed = "", from = ""]) => {
		const kept = listed
			.split(",")
			.map((name) => name.trim())
			.filter((name) => names.includes(name));
		return kept.length === 0 ? [] : [`import { ${kept.join(", ")} } from ${from};`];
	});
}
