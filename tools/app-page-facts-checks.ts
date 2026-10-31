import { app } from "@widgetarium/core/requests";
import { RecordAppPageCommand } from "../packages/state/places/index.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { check } from "./check-helpers.ts";
import { placedTabsOf, placesOver } from "./places-fixture.ts";

const LONG_TITLE = "t".repeat(201);
const FOREIGN_FAVICON = "sumi-app://other/1.0.0/icon.png";

export async function pageFactChecks(): Promise<void> {
	const tabs = new MemoryTabsGateway(
		placedTabsOf({
			tabs: [{ id: "t1", app: "hello", pageId: null, label: null, lastAddress: "" }],
			shownId: "t1",
			minted: 1,
			closed: [],
		}),
	);
	const places = app()
		.imports(placesOver(tabs))
		.start({ platform: "browser", scope: { workspaceId: "default" } });
	const recorded = async (): Promise<unknown> => {
		const tab = (await tabs.placedTabs()).tabs.find(({ id }) => id === "t1");
		return [tab?.lastTitle ?? null, tab?.lastFavicon ?? null];
	};
	const refusedOf = async (page: Record<string, string>): Promise<boolean> =>
		!(await places.send(RecordAppPageCommand, { id: "t1", ...page })).ok;

	check("a title past 200 characters is refused", await refusedOf({ title: LONG_TITLE }), true);
	check("an address past 2048 characters is refused", await refusedOf({ address: `/${"a".repeat(2048)}` }), true);
	check("a favicon on the web is refused", await refusedOf({ favicon: "https://example.com/icon.png" }), true);
	check(
		"a data favicon past 64 KiB is refused",
		await refusedOf({ favicon: `data:image/png;base64,${"A".repeat(65_536)}` }),
		true,
	);
	check("another app's favicon alone is refused", await refusedOf({ favicon: FOREIGN_FAVICON }), true);
	await places.send(RecordAppPageCommand, { id: "t1", title: "Hello", favicon: FOREIGN_FAVICON });
	check("another app's favicon is dropped and the title beside it kept", await recorded(), ["Hello", null]);
	await places.send(RecordAppPageCommand, { id: "t1", favicon: "sumi-app://hello/1.0.0/icon.png" });
	check("the app's own favicon is kept", await recorded(), ["Hello", "sumi-app://hello/1.0.0/icon.png"]);
	places.stop();
}
