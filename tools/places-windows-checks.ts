import { builtInPlacedApps } from "./placed-apps-fixture.ts";
import { runtime, localTransport } from "@widgetarium/data-framework";
import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { MemoryTabsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/memory.gateway.ts";
import { navigation as RunnablePlacesModule } from "../plugins/tabs/navigation/data/navigation/generated/module.ts";
import { check, tally, waitFor } from "./check-helpers.ts";

const core = localTransport();
core.serve(
	runtime()
		.modules(RunnablePlacesModule({ injects: { tabs: new MemoryTabsGateway(), placedApps: builtInPlacedApps() } }))
		.start({ platform: "server", env: {} }),
);
const main = runtime()
	.imports(navigation({ over: core }))
	.start();
const side = runtime()
	.imports(navigation({ over: core }))
	.start();
const labelsOf = async (): Promise<readonly string[]> => {
	const answered = await side.send(navigation.windows.all);
	return answered.ok ? answered.output.windows.map((open) => open.label) : [answered.reason];
};

await main.send(navigation.windows.openWindow, { window: "main" });
await side.send(navigation.windows.openWindow, { window: "studio-2" });
check("every window that opens is in the one registry the core keeps", await labelsOf(), ["main", "studio-2"]);

await side.send(navigation.windows.openWindow, { window: "studio-2" });
check("a window opened twice is held once", await labelsOf(), ["main", "studio-2"]);

const heard = { count: 0 };
main.routes.watch(navigation.windows.all, undefined, () => {
	heard.count += 1;
});
await side.send(navigation.windows.closeWindow, { window: "studio-2" });
check("a closed window leaves the registry", await labelsOf(), ["main"]);
check("and the other window hears it without asking", await waitFor(() => heard.count > 0), true);

await main.send(navigation.windows.openWindow, { window: "studio-3" });
await main.send(navigation.windows.keepLiveWindows, { windows: ["main"] });
check("a window the app no longer has leaves when the core checks what is open", await labelsOf(), ["main"]);

console.log(tally.failed ? `places windows: ${tally.failed} check(s) failed` : "places windows: all checks passed");
process.exit(tally.failed ? 1 : 0);
