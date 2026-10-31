import { AppTabsQuery, OpenLinkCommand } from "../packages/domain/app-host/generated/contract.ts";
import { FrameLinkPace, linkToOpenOf } from "../apps/studio/src/features/app-frame/lib/frame-link.ts";
import { studioFakesOf } from "./app-host-fixture.ts";
import { check } from "./check-helpers.ts";

const PACE_WINDOW_MS = 10_000;

export async function linkChecks(): Promise<void> {
	check(
		"here opens in place",
		linkToOpenOf({ type: "open-link", href: "sumi://task/T-1", where: "here" }).opensNew,
		false,
	);
	check("tab opens new", linkToOpenOf({ type: "open-link", href: "sumi://task/T-1", where: "tab" }).opensNew, true);
	check("split opens new", linkToOpenOf({ type: "open-link", href: "sumi://task/T-1", where: "split" }).opensNew, true);

	const studio = studioFakesOf().studioApp;
	const tabsNow = async () => {
		const tabs = await studio.send(AppTabsQuery);
		return tabs.ok ? tabs.output.tabs : [];
	};

	await studio.send(OpenLinkCommand, linkToOpenOf({ type: "open-link", href: "sumi://task/T-3", where: "tab" }));
	const task = (await tabsNow()).find((tab) => tab.isShown);
	check("a sumi link from a frame opens through the shell's links", [task?.app, task?.address], ["tasks", "T-3"]);

	const web = await studio.send(
		OpenLinkCommand,
		linkToOpenOf({ type: "open-link", href: "https://example.com/a", where: "tab" }),
	);
	const browserTabs = (await tabsNow()).filter((tab) => tab.app === "browser");
	check(
		"an https link opens a browser tab at that page",
		[web.ok, browserTabs.map((tab) => tab.favicon)],
		[true, ["https://example.com/favicon.ico"]],
	);

	const other = await studio.send(OpenLinkCommand, { href: "javascript:alert(1)", opensNew: false });
	check(
		"any other scheme is refused with a reason",
		other.ok ? null : other.reason,
		"javascript:alert(1) opens nowhere: Sumi opens sumi://<chat|task|tab|app>/<id> links and https:// pages",
	);

	const long = await studio.send(OpenLinkCommand, { href: `https://example.com/${"a".repeat(2048)}`, opensNew: true });
	check("an href over 2048 characters is refused", long.ok, false);
	paceChecks();
}

function paceChecks(): void {
	const pace = new FrameLinkPace();
	const admitted = Array.from({ length: 6 }, (_, at) => pace.admits(at));
	check("a frame opens five links in ten seconds, not a sixth", admitted, [true, true, true, true, true, false]);
	check("once the window passes it opens again", pace.admits(PACE_WINDOW_MS), true);
}
