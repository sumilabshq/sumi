import path from "node:path";
import type { Rule } from "eslint";
import { moduleOfDomain } from "../domain-file.js";
import { fieldOf } from "../guards.js";
import { importListener } from "../imports.js";
import { jsonAt, workspacePackagesIn } from "../workspace.js";
import type { WorkspacePackage } from "../workspace.js";

type Place = "server-app" | "client-starter" | "elsewhere";

interface Said {
	readonly messageId: string;
	readonly data: Readonly<Record<string, string>>;
}

interface Importing {
	readonly packages: readonly WorkspacePackage[];
	readonly owner: WorkspacePackage;
	readonly importer: string;
	readonly place: Place;
	readonly cwd: string;
}

const DOMAIN_LEVEL = "domain";
const WIRING_ENTRIES: ReadonlySet<string> = new Set(["module", "gateways"]);
const REQUESTS_MODULE_ENTRIES: ReadonlySet<string> = new Set(["module"]);
const SERVER_CONDITION = "server";
const DECLARATION_FILE = /\.d\.ts$/;
const CLIENT_STARTER = /^apps\/[^/]+$/;

export const moduleImports: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: { description: "packages meet through their entries; a module's wiring belongs to the app that runs it" },
		schema: [],
		messages: {
			acrossPackages: "{{specifier}} reaches into {{owner}}, another package; import it by its package name",
			serverWiring:
				'{{specifier}} wires a server module: only a server app imports it (a package whose tsconfig sets customConditions ["server"], today apps/server)',
			clientWiring:
				"{{specifier}} wires a client module: only a client app starter (apps/*, not a server app) or a host (apps/host-*) imports it",
			appWiring:
				'{{specifier}} starts a module(...): only an app (apps/*) imports it; a package reaches it through its "." entry',
			noSuchEntry:
				'{{specifier}} is not an entry of {{name}}: a module exports only ".", "./module" and "./gateways", a module(...) only "." and "./module"',
		},
	},
	create(context) {
		const importer = path.relative(context.cwd, context.filename).split(path.sep).join("/");
		const packages = workspacePackagesIn(context.cwd).sort((one, other) => other.folder.length - one.folder.length);
		const owner = ownerOf(packages, importer);
		if (owner === null || DECLARATION_FILE.test(importer)) return {};
		const importing = { packages, owner, importer, place: placeOf(context.cwd, owner), cwd: context.cwd };
		return importListener((node, specifier) => {
			const said = findingOf(importing, specifier);
			if (said !== null) context.report({ node, messageId: said.messageId, data: said.data });
		});
	},
};

function findingOf(importing: Importing, specifier: string): Said | null {
	const { packages, owner, importer } = importing;
	if (specifier.startsWith(".")) {
		const reached = ownerOf(packages, path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier)));
		return reached !== null && reached !== owner
			? { messageId: "acrossPackages", data: { specifier, owner: reached.folder } }
			: null;
	}
	const domain = packages.find((one) => one.level === DOMAIN_LEVEL && specifier.startsWith(`${one.name}/`));
	if (domain === undefined || domain === owner) return null;
	if (!wiringEntriesOf(importing.cwd, domain).has(specifier.slice(domain.name.length + 1)))
		return { messageId: "noSuchEntry", data: { specifier, name: domain.name } };
	return wiringFinding(importing, domain, specifier);
}

function wiringEntriesOf(cwd: string, domain: WorkspacePackage): ReadonlySet<string> {
	return moduleOfDomain(path.join(cwd, domain.folder))?.runs === "anywhere" ? REQUESTS_MODULE_ENTRIES : WIRING_ENTRIES;
}

function wiringFinding({ place, cwd }: Importing, domain: WorkspacePackage, specifier: string): Said | null {
	const runs = moduleOfDomain(path.join(cwd, domain.folder))?.runs;
	if (runs === "anywhere") return place === "elsewhere" ? { messageId: "appWiring", data: { specifier } } : null;
	if (runs === "server") return place === "server-app" ? null : { messageId: "serverWiring", data: { specifier } };
	return place === "client-starter" ? null : { messageId: "clientWiring", data: { specifier } };
}

function placeOf(cwd: string, owner: WorkspacePackage): Place {
	if (conditionsOf(path.join(cwd, owner.folder, "tsconfig.json")).includes(SERVER_CONDITION)) return "server-app";
	return CLIENT_STARTER.test(owner.folder) ? "client-starter" : "elsewhere";
}

function conditionsOf(tsconfig: string): readonly unknown[] {
	const conditions = fieldOf(fieldOf(jsonAt(tsconfig), "compilerOptions"), "customConditions");
	return Array.isArray(conditions) ? conditions : [];
}

function ownerOf(packages: readonly WorkspacePackage[], file: string): WorkspacePackage | null {
	return packages.find((one) => file.startsWith(`${one.folder}/`)) ?? null;
}
