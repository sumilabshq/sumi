import { app, localTransport } from "@widgetarium/core/requests";
import { server } from "@widgetarium/core/requests/server";
import {
	CloseWindowCommand,
	KeepLiveWindowsCommand,
	OpenWindowCommand,
	OpenWindowsQuery,
	PlacesModule,
} from "../packages/state/places/index.ts";
import { MemoryWindowsGateway } from "../packages/state/places/gateways/windows/memory.gateway.ts";
import { PlacesModule as RunnablePlacesModule } from "../packages/state/places/module.ts";
import { check, tally, waitFor } from "./check-helpers.ts";

const windows = new MemoryWindowsGateway({ windows: [] });
const core = localTransport();
server().modules(RunnablePlacesModule.with({ windows })).listen(core).start({ env: {} });
const main = app().imports(PlacesModule.over(core)).start();
const side = app().imports(PlacesModule.over(core)).start();
const labelsOf = async (): Promise<readonly string[]> => {
	const answered = await side.send(OpenWindowsQuery);
	return answered.ok ? answered.output.windows.map((open) => open.label) : [answered.reason];
};

await main.send(OpenWindowCommand, { window: "main" });
await side.send(OpenWindowCommand, { window: "studio-2" });
check("every window that opens is in the one registry the core keeps", await labelsOf(), ["main", "studio-2"]);

await side.send(OpenWindowCommand, { window: "studio-2" });
check("a window opened twice is held once", await labelsOf(), ["main", "studio-2"]);

const heard = { count: 0 };
main.routes.watch(OpenWindowsQuery, undefined, () => {
	heard.count += 1;
});
await side.send(CloseWindowCommand, { window: "studio-2" });
check("a closed window leaves the registry", await labelsOf(), ["main"]);
check("and the other window hears it without asking", await waitFor(() => heard.count > 0), true);

await main.send(OpenWindowCommand, { window: "studio-3" });
await main.send(KeepLiveWindowsCommand, { windows: ["main"] });
check("a window the app no longer has leaves when the core checks what is open", await labelsOf(), ["main"]);

console.log(tally.failed ? `places windows: ${tally.failed} check(s) failed` : "places windows: all checks passed");
process.exit(tally.failed ? 1 : 0);
