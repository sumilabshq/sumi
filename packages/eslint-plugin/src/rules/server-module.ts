import fs from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";
import { FEATURES, MODULE_FILE, domainFileOf, moduleOfDomain } from "../domain-file.js";
import { entriesUnder } from "../files.js";
import { fieldOf, isRecord } from "../guards.js";
import { jsonAt } from "../workspace.js";

const SERVER_CONDITION = "server";
const GATED_ENTRIES = ["./module", "./gateways"];
const UI_FOLDER = "ui";
const UI_FOLDERS = ["shared/ui"];

export const serverModule: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: { description: "a server module is reachable only under the server condition and draws nothing" },
		schema: [],
		messages: {
			ungated:
				'a server module\'s package.json exports {{entry}} only as { "server": "./generated/…" }, so no client build resolves it',
			serverUi: "a server module draws nothing: move {{folder}}/ to a client module",
		},
	},
	create(context) {
		const file = domainFileOf(context.filename);
		if (file === null || file.inside.join("/") !== MODULE_FILE || moduleOfDomain(file.root)?.runs !== "server")
			return {};
		return {
			Program(node) {
				const exported = exportsOf(jsonAt(path.join(file.root, "package.json")));
				for (const entry of GATED_ENTRIES.filter((one) => one in exported && !isGated(exported[one])))
					context.report({ node, messageId: "ungated", data: { entry } });
				for (const folder of uiFoldersIn(file.root)) context.report({ node, messageId: "serverUi", data: { folder } });
			},
		};
	},
};

function exportsOf(manifest: unknown): Readonly<Record<string, unknown>> {
	const exported = fieldOf(manifest, "exports");
	return isRecord(exported) ? exported : {};
}

function isGated(entry: unknown): boolean {
	if (!isRecord(entry)) {
		return false;
	}

	const conditions = Object.keys(entry);
	return conditions.length === 1 && conditions[0] === SERVER_CONDITION;
}

function uiFoldersIn(root: string): string[] {
	const featureUi = entriesUnder(path.join(root, FEATURES))
		.filter(({ full, isFolder }) => isFolder && path.basename(full) === UI_FOLDER)
		.map(({ full }) => path.relative(root, full));
	return [...UI_FOLDERS.filter((folder) => fs.existsSync(path.join(root, folder))), ...featureUi];
}
