import { BUILT_IN_APPS } from "./placed-apps-fixture.ts";
import {
	emptyMoment,
	openTab,
	placeTab,
} from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/host-tabs.ts";
import type { HostTabsMoment } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/host-tabs.ts";
import {
	WORKSPACE_LIST,
	flatTabIdsOf,
	locationOf,
} from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-lists.ts";
import { tabBreaksOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-invariants.ts";
import { placeInView, placeSplit } from "../plugins/tabs/navigation/data/navigation/shared/lib/splits/split-moves.ts";
import {
	splitBreaksOf,
	splitsPruned,
} from "../plugins/tabs/navigation/data/navigation/shared/lib/splits/split-members.ts";
import { sidebarOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/rows/sidebar-rows.ts";
import { addGroup } from "../plugins/tabs/tab-groups/data/tab-groups/shared/lib/tab-groups.ts";

let failed = 0;
console.info = () => undefined;

function check(name: string, seen: unknown, wanted: unknown): void {
	const isOk = JSON.stringify(seen) === JSON.stringify(wanted);
	failed += isOk ? 0 : 1;
	console.log(
		`${isOk ? "ok  " : "FAIL"} ${name}${isOk ? "" : ` — saw ${JSON.stringify(seen)}, wanted ${JSON.stringify(wanted)}`}`,
	);
}

const atEnd = (list: string) => ({ chatId: list, groupId: null, before: null });
const moved = (move: ReturnType<typeof placeSplit>, was: HostTabsMoment): HostTabsMoment =>
	"moment" in move ? move.moment : was;
const breaks = (moment: HostTabsMoment) => [...tabBreaksOf(moment), ...splitBreaksOf(moment)];

const chat = openTab(emptyMoment(BUILT_IN_APPS), { app: "chat", pageId: null }, atEnd(WORKSPACE_LIST));
const one = openTab(chat.moment, { app: "browser", pageId: null }, atEnd(WORKSPACE_LIST));
const two = openTab(one.moment, { app: "canvas", pageId: null }, atEnd(WORKSPACE_LIST));
const loose = openTab(two.moment, { app: "browser", pageId: null }, atEnd(WORKSPACE_LIST));
const [chatId, oneId, twoId, looseId] = [chat.tab.id, one.tab.id, two.tab.id, loose.tab.id];
const grouped = addGroup(loose.moment, { chatId: WORKSPACE_LIST, withTabId: looseId, inGroupId: null });
const groupId = grouped.groupId;
const split = moved(placeInView(grouped.moment, { tabId: twoId, targetTabId: oneId, side: "right" }), grouped.moment);
const splitId = split.splits[0]?.id ?? "";

check("two tabs make a split in the workspace list", split.splits[0]?.memberIds, [oneId, twoId]);

const inGroup = splitsPruned(moved(placeSplit(split, splitId, { list: WORKSPACE_LIST, groupId, before: null }), split));
check("a split carried into a group keeps both tabs", inGroup.splits[0]?.memberIds, [oneId, twoId]);
check(
	"both tabs now stand in the group",
	[locationOf(inGroup, oneId)?.groupId, locationOf(inGroup, twoId)?.groupId],
	[groupId, groupId],
);
check("a split in a group breaks no law", breaks(inGroup), []);

const sidebar = sidebarOf({ moment: inGroup, pages: [], highlightedIds: new Set(), elsewhere: [] });
const group = sidebar.sections[0]?.entries.find((entry) => entry.kind === "group");
check(
	"the sidebar draws the split as one block inside the group",
	group?.kind === "group" ? group.group.items.map((item) => item.kind) : null,
	["tab", "split"],
);

const oneOut = splitsPruned(placeTab(inGroup, oneId, atEnd(WORKSPACE_LIST))?.moment ?? inGroup);
check("a tab carried out of the group leaves the split", oneOut.splits.length, 0);

const intoPage = splitsPruned(moved(placeSplit(split, splitId, { list: chatId, groupId: null, before: null }), split));
check("a split dropped onto a page unsplits", intoPage.splits.length, 0);
check("its tabs become sub-pages of that page", flatTabIdsOf(intoPage, chatId), [oneId, twoId]);
check("an unsplit into a page breaks no law", breaks(intoPage), []);

const missing = placeSplit(split, "split-none", { list: WORKSPACE_LIST, groupId: null, before: null });
check("a split that does not exist is refused", "refusal" in missing, true);

console.log(failed === 0 ? "split places: all checks pass" : `split places: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
