import { APP_MODULES } from "@widgetarium/app-registry/modules";
import { FileSystemModule } from "@widgetarium/file-system/module";
import { PlacesModule } from "@widgetarium/places/module";
import { QuestionsModule } from "@widgetarium/questions/module";
import { BUILT_IN_PROFILE, resolvePlugins } from "../apps/host-tauri/src/plugins/sumi-plugins.ts";
import { check, tally } from "./check-helpers.ts";

const resolved = resolvePlugins(BUILT_IN_PROFILE);
const coreModules = [PlacesModule, FileSystemModule, QuestionsModule, ...APP_MODULES];

check("the built-in profile resolves with no refusal", resolved.refusals, []);
check(
	"the core starts the same modules as before, in the same order, now from the shared modules slot",
	resolved.sharedModules.length === coreModules.length &&
		resolved.sharedModules.every((module, at) => module === coreModules[at]),
	true,
);

const mainOff = resolvePlugins({ plugins: ["sumi-host"], locked: ["sumi-host", "main"] });
check(
	"turning the locked main plugin off is refused, and its modules do not start",
	[mainOff.refusals, mainOff.sharedModules],
	[["sumi.profile.json locks plugin main, which it does not enable: a locked plugin cannot be disabled"], []],
);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("sumi plugins: all checks passed");
