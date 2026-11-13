import {
	MemoryPluginStateStore,
	plugin,
	runtime as pluginRuntime,
} from "../packages/shared/plugin-framework/src/index.ts";
import { secrets } from "../plugins/sumi-host/src/index.ts";
import type { Secrets } from "../plugins/sumi-host/src/index.ts";
import { MemorySecretVault, secretsFor } from "../apps/studio/src/plugins/secret-vault.ts";
import { check, tally } from "./check-helpers.ts";

const handed = new Map<string, Secrets>();
const keeper = plugin("keeper")
	.require(secrets)
	.apply((app) => {
		handed.set("keeper", app.use(secrets));
	});
const prier = plugin("prier")
	.require(secrets)
	.apply((app) => {
		handed.set("prier", app.use(secrets));
	});

pluginRuntime()
	.builtInPlugins(keeper, prier)
	.state(new MemoryPluginStateStore([keeper.id, prier.id]))
	.provide(secrets, secretsFor(new MemorySecretVault()))
	.start();

const keeperSecrets = handed.get("keeper");
const prierSecrets = handed.get("prier");

if (keeperSecrets === undefined || prierSecrets === undefined) {
	throw new Error("secrets checks: a plugin was not handed its secrets");
}

await keeperSecrets.write("api-key", "sk-keeper");
check("a plugin reads back the secret it wrote", await keeperSecrets.read("api-key"), "sk-keeper");
check("another plugin asking for the same key reads nothing", await prierSecrets.read("api-key"), null);
await prierSecrets.write("api-key", "sk-prier");
check(
	"another plugin's write under the same key leaves the first one's",
	await keeperSecrets.read("api-key"),
	"sk-keeper",
);
await keeperSecrets.remove("api-key");
check("a removed secret reads as nothing", await keeperSecrets.read("api-key"), null);
check("removing one plugin's secret keeps the other's", await prierSecrets.read("api-key"), "sk-prier");

if (tally.failed > 0) {
	process.exit(1);
}

console.log("secrets: all checks passed");
