import { APP_MODULES } from "@widgetarium/app-registry/modules";
import { FileSystemModule } from "@widgetarium/file-system/module";
import { PlacesModule } from "@widgetarium/places/module";
import { QuestionsModule } from "@widgetarium/questions/module";
import { TasksModule } from "@widgetarium/tasks/module";
import { TerminalModule } from "@widgetarium/terminal/module";
import { HOST_CAPABILITY_MODULES } from "../apps/host-tauri/src/plugins/host-capabilities.ts";
import { BUILT_IN_PROFILE, resolvePlugins } from "../apps/host-tauri/src/plugins/sumi-plugins.ts";
import { check, tally } from "./check-helpers.ts";

const resolved = resolvePlugins(BUILT_IN_PROFILE);
const coreModulesBefore = [PlacesModule, FileSystemModule, QuestionsModule, ...APP_MODULES];
const coreModulesNow = [...HOST_CAPABILITY_MODULES, ...resolved.sharedModules];

check("the built-in profile resolves with no refusal", resolved.refusals, []);
check(
	"the host runs the machine capabilities itself: files and terminal sessions",
	HOST_CAPABILITY_MODULES.length === 2 &&
		HOST_CAPABILITY_MODULES[0] === FileSystemModule &&
		HOST_CAPABILITY_MODULES[1] === TerminalModule,
	true,
);
check(
	"the main plugin fills only the old app's modules, none of the host's",
	resolved.sharedModules.length === 3 &&
		resolved.sharedModules[0] === PlacesModule &&
		resolved.sharedModules[1] === QuestionsModule &&
		resolved.sharedModules[2] === TasksModule,
	true,
);
check(
	"the core still starts every module it started before, each once",
	coreModulesNow.length === coreModulesBefore.length &&
		coreModulesBefore.every((module) => coreModulesNow.filter((now) => now === module).length === 1),
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
