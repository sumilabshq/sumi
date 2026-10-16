import path from "node:path";
import type { Rule } from "eslint";
import { domainFileOf } from "../domain-file.js";
import type { DomainFile } from "../domain-file.js";
import { importListener } from "../imports.js";
import { workspacePackagesIn } from "../workspace.js";

const CONTRACT_FILE = "contract.ts";
const SCHEMAS = "shared/schema/";
const DOMAIN_LEVEL = "domain";

export const contractImports: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: { description: "a contract imports only schemas, the request builders and shared packages" },
		schema: [],
		messages: {
			reachesIn:
				"a contract imports only shared/schema, @widgetarium/core/requests and shared packages; {{specifier}} is not one of them",
			wiring: "a contract never imports a module's wiring: {{specifier}}",
		},
	},
	create(context) {
		const file = domainFileOf(context.filename);
		if (file === null || file.folder !== "features" || file.inside.at(-1) !== CONTRACT_FILE) return {};
		const domains = workspacePackagesIn(context.cwd)
			.filter(({ level }) => level === DOMAIN_LEVEL)
			.map(({ name }) => name);
		return importListener((node, specifier) => {
			const messageId = refusalOf(file, context.filename, specifier, domains);
			if (messageId !== null) context.report({ node, messageId, data: { specifier } });
		});
	},
};

function refusalOf(file: DomainFile, filename: string, specifier: string, domains: readonly string[]): string | null {
	if (specifier.startsWith(".")) return isSchema(file, filename, specifier) ? null : "reachesIn";
	return domains.some((name) => specifier.startsWith(`${name}/`)) ? "wiring" : null;
}

function isSchema(file: DomainFile, filename: string, specifier: string): boolean {
	const target = path
		.relative(file.root, path.resolve(path.dirname(filename), specifier))
		.split(path.sep)
		.join("/");
	return target.startsWith(SCHEMAS);
}
