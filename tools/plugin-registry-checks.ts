import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { runtime } from "@widgetarium/data-framework";
import { StoreClient, memoryStoreInvoke } from "../packages/shared/behaviors/tauri-store.ts";
import { plugins as registryContract } from "../packages/state/plugin-registry/generated/contract.ts";
import { plugins as registryModule } from "../packages/state/plugin-registry/generated/module.ts";
import { PluginMetadataSchema } from "../packages/state/plugin-registry/shared/schema/registry.schema.ts";
import { check, tally } from "./check-helpers.ts";

const METADATA = {
	title: "X",
	description: "x",
	type: "visual",
	preview: null,
	author: "Sumi",
	official: true,
	adds: [],
	reaches: [],
	source: null,
	readme: null,
};

const catalogue = [
	{ id: "core", metadata: METADATA, requires: [], alwaysOn: true },
	{ id: "files", metadata: METADATA, requires: ["core"], alwaysOn: false },
	{ id: "viewer", metadata: METADATA, requires: ["files"], alwaysOn: false },
	{ id: "badge", metadata: { title: 1 }, requires: ["viewer"], alwaysOn: false },
	{ id: "lone", metadata: METADATA, requires: [], alwaysOn: false },
];

console.info = () => undefined;
console.error = () => undefined;

function registryOver(store: StoreClient, startedIds: readonly string[]) {
	return runtime()
		.modules(registryModule({ catalogue, startedIds, tauri: { store } }))
		.start({ platform: "browser", scope: { workspaceId: "checks" } });
}

const store = new StoreClient(memoryStoreInvoke());
const all = ["core", "files", "viewer", "badge", "lone"];
const app = registryOver(store, all);

async function enabledIds(): Promise<unknown> {
	const answer = await app.send(registryContract.registry.all);
	return answer.ok ? answer.output.plugins.filter((one) => one.enabled).map((one) => one.id) : answer.reason;
}

const first = await app.send(registryContract.registry.all);
check("every catalogued plugin is listed", first.ok ? first.output.plugins.length : first.reason, 5);
check(
	"a plugin with unreadable metadata is listed with none",
	first.ok ? first.output.plugins[3]?.metadata : null,
	null,
);
check("nothing needs a restart at the start", first.ok ? first.output.restartNeeded : null, false);

const plan = await app.send(registryContract.registry.disablePlan, { id: "files" });
check("the plan names every transitive dependent", plan.ok ? plan.output.alsoOff : plan.reason, ["viewer", "badge"]);

const refusedAlwaysOn = await app.send(registryContract.registry.setEnabled, { id: "core", enabled: false });
check("an always-on plugin cannot be turned off", refusedAlwaysOn.ok, false);

await app.send(registryContract.registry.setEnabled, { id: "files", enabled: false });
check("turning one off cascades to its dependents", await enabledIds(), ["core", "lone"]);
const afterOff = await app.send(registryContract.registry.all);
check("a change asks for a restart", afterOff.ok ? afterOff.output.restartNeeded : null, true);

await app.send(registryContract.registry.setEnabled, { id: "viewer", enabled: true });
check("turning one on brings back what it requires", await enabledIds(), ["core", "files", "viewer", "lone"]);

const unknown = await app.send(registryContract.registry.setEnabled, { id: "nope", enabled: false });
check("an unknown plugin is refused", unknown.ok, false);

const restarted = registryOver(store, ["core", "files", "viewer", "lone"]);
const kept = await restarted.send(registryContract.registry.all);
check(
	"choices are read back from the plugin state",
	kept.ok ? kept.output.plugins.filter((one) => one.enabled).map((one) => one.id) : kept.reason,
	["core", "files", "viewer", "lone"],
);
check("no restart is needed when the start matches the state", kept.ok ? kept.output.restartNeeded : null, false);

const files = globSync("plugins/**/metadata.json").filter((file) => !file.includes("node_modules"));
const broken = files.filter((file) => !PluginMetadataSchema.safeParse(JSON.parse(readFileSync(file, "utf8"))).success);
check("every plugin's metadata.json fits the schema", broken, []);
check("there is a metadata.json for every plugin", files.length >= 50, true);

console.log(tally.failed ? `plugin registry: ${tally.failed} check(s) failed` : "plugin registry: all checks passed");
process.exit(tally.failed ? 1 : 0);
