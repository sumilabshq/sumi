import type { AppKind } from "../../schema/app-tab.schema.js";
import type { ListEntry } from "../../schema/tab-group.schema.js";
import type { KeptTabs } from "../../schema/tabs-session.schema.js";
import { shownTabIdOf } from "../tab-showing/show-tab.js";
import { Watchers } from "../watchers/watchers.js";
import {
	chatOfGroup,
	flatTabIdsOf,
	freeGroupNameOf,
	findGroup,
	placeAfterOf,
	locationOf,
	withEntryBefore,
	withTabAt,
	withoutTab,
} from "./tab-lists.js";
import type { TabGroup, TabLayout, TabPlace } from "./tab-lists.js";
import {
	closedPlaceOf,
	emptyMoment,
	groupChangeSaid,
	isSameGroupFace,
	keptClosed,
	labelSaid,
	lastShownWith,
	momentOfKept,
	reopenPlaceOf,
	withoutGroup,
} from "./host-tabs-moment.js";
import type { ClosedTab, GroupChange, HostTab, HostTabsMoment, OpenedTab, TabPage } from "./host-tabs-moment.js";

export type { TabGroup, TabPlace } from "./tab-lists.js";

export type { ClosedTab, GroupChange, HostTab, HostTabsMoment, OpenedTab, TabPage } from "./host-tabs-moment.js";
export { CLOSED_KEPT } from "./host-tabs-moment.js";

const NO_TAB = 'the host holds no tab "{id}"';
const NO_GROUP = 'the host holds no group "{id}"';

export class HostTabs {
	private readonly watchers = new Watchers();
	private moment: HostTabsMoment;

	constructor(kept: KeptTabs | null, chatId: string) {
		this.moment = kept === null ? emptyMoment() : momentOfKept(kept, chatId);
	}

	now = (): HostTabsMoment => this.moment;

	watch = (changed: () => void): (() => void) => this.watchers.watch(changed);

	shownIdFor(shownApp: AppKind | null): string | null {
		return shownTabIdOf(this.moment, shownApp);
	}

	tabOf(id: string): HostTab {
		const found = this.moment.tabs.find((tab) => tab.id === id);

		if (!found) {
			throw new Error(NO_TAB.replace("{id}", id));
		}

		return found;
	}

	open(opened: OpenedTab, place: TabPlace): HostTab {
		const tab = this.mintTab(opened, null);
		this.become(
			{
				...this.moment,
				...withTabAt(this.moment, tab.id, place),
				tabs: [...this.moment.tabs, tab],
				shownId: tab.id,
				lastShown: lastShownWith(this.moment.lastShown, place.chatId, tab.id),
				minted: this.moment.minted + 1,
			},
			`open ${tab.id} (${tab.app}) in ${place.chatId}${place.groupId === null ? "" : `/${place.groupId}`}`,
		);
		return tab;
	}

	openAfter(afterId: string, opened: OpenedTab): HostTab {
		const place = placeAfterOf(this.moment, afterId);

		if (place === null) {
			throw new Error(NO_TAB.replace("{id}", afterId));
		}

		return this.open(opened, place);
	}

	openEssential(essentialId: string, opened: OpenedTab): HostTab {
		const tab = this.mintTab(opened, essentialId);
		this.become(
			{
				...this.moment,
				tabs: [...this.moment.tabs, tab],
				shownId: tab.id,
				minted: this.moment.minted + 1,
			},
			`open ${tab.id} for essential ${essentialId}`,
		);
		return tab;
	}

	show(id: string): void {
		this.tabOf(id);
		const chatId = locationOf(this.moment, id)?.chatId ?? null;

		if (this.moment.shownId === id) {
			return;
		}

		this.become(
			{
				...this.moment,
				shownId: id,
				lastShown: chatId === null ? this.moment.lastShown : lastShownWith(this.moment.lastShown, chatId, id),
			},
			`show ${id}`,
		);
	}

	close(ids: readonly string[], pages: ReadonlyMap<string, TabPage>, reason: string): void {
		this.become(this.closedMoment(ids, pages), reason);
	}

	closeGroup(groupId: string, pages: ReadonlyMap<string, TabPage>): void {
		const group = this.heldGroupOf(groupId);
		const closed = this.closedMoment(group.tabIds, pages);
		this.become(
			{
				...closed,
				...withoutGroup(closed, groupId, []),
			},
			`close group ${groupId} with ${group.tabIds.length} tabs`,
		);
	}

	reopenClosed(chatId: string): ClosedTab | null {
		const last = this.moment.closed.at(-1);

		if (!last) {
			return null;
		}

		this.become(
			this.reopenedMoment(last, chatId),
			`reopen ${last.tab.id} in ${last.tab.essentialId === null ? chatId : "essentials"}`,
		);
		return last;
	}

	rename(id: string, typed: string): void {
		const renamed = this.tabOf(id);
		const label = typed.trim() || null;

		if (renamed.label === label) {
			return;
		}

		this.become(
			{
				...this.moment,
				tabs: this.withTab(id, { label }),
			},
			`rename ${id}, ${labelSaid(renamed.label)} → ${labelSaid(label)}`,
		);
	}

	place(id: string, place: TabPlace): void {
		const moved = this.tabOf(id);

		if (place.before === id) {
			return;
		}

		this.become(
			{
				...this.moment,
				...withTabAt(withoutTab(this.moment, id), id, place),
				tabs: this.withTab(id, { essentialId: null }),
			},
			`place ${id} in ${place.chatId}/${place.groupId ?? "list"} before ${place.before ?? "the end"}${moved.essentialId === null ? "" : `, was essential ${moved.essentialId}`}`,
		);
	}

	makeEssential(id: string, essentialId: string): void {
		this.tabOf(id);
		this.become(
			{
				...this.moment,
				...withoutTab(this.moment, id),
				tabs: this.withTab(id, { essentialId }),
			},
			`${id} becomes essential ${essentialId}`,
		);
	}

	newGroup(chatId: string, withTabId: string | null): string {
		const group = this.mintGroup(chatId, withTabId);
		this.become(
			this.groupedMoment(group, chatId, withTabId),
			`new group ${group.id} "${group.name}" in ${chatId}${withTabId === null ? "" : ` with ${withTabId}`}`,
		);
		return group.id;
	}

	changeGroup(groupId: string, change: GroupChange): void {
		const group = this.heldGroupOf(groupId);
		const next = {
			...group,
			...change,
		};

		if (isSameGroupFace(next, group)) {
			return;
		}

		this.becomeLayout(this.layoutWithGroup(next), groupChangeSaid(group, next));
	}

	ungroup(groupId: string): void {
		const group = this.heldGroupOf(groupId);
		this.becomeLayout(
			withoutGroup(this.moment, groupId, group.tabIds),
			`ungroup ${groupId}, ${group.tabIds.length} tabs`,
		);
	}

	private heldGroupOf(groupId: string): TabGroup {
		const group = findGroup(this.moment.groups, groupId);

		if (!group) {
			throw new Error(NO_GROUP.replace("{id}", groupId));
		}

		return group;
	}

	private mintTab(opened: OpenedTab, essentialId: string | null): HostTab {
		return {
			...opened,
			id: `tab-${this.moment.minted + 1}`,
			label: null,
			essentialId,
		};
	}

	private withTab(id: string, change: Partial<HostTab>): readonly HostTab[] {
		return this.moment.tabs.map((tab) =>
			tab.id === id
				? {
						...tab,
						...change,
					}
				: tab,
		);
	}

	private reopenedMoment(last: ClosedTab, chatId: string): HostTabsMoment {
		return {
			...this.moment,
			...this.reopenedLayoutOf(last, chatId),
			tabs: [...this.moment.tabs, last.tab],
			shownId: last.tab.id,
			closed: this.moment.closed.slice(0, -1),
		};
	}

	private reopenedLayoutOf(last: ClosedTab, chatId: string): TabLayout {
		if (last.tab.essentialId !== null) {
			return this.moment;
		}

		return withTabAt(this.moment, last.tab.id, reopenPlaceOf(this.moment, last, chatId));
	}

	private mintGroup(chatId: string, withTabId: string | null): TabGroup {
		return {
			id: `group-${this.moment.minted + 1}`,
			name: freeGroupNameOf(this.moment, chatId),
			hue: null,
			isOpen: true,
			tabIds: withTabId === null ? [] : [withTabId],
		};
	}

	private groupedMoment(group: TabGroup, chatId: string, withTabId: string | null): HostTabsMoment {
		const layout = withTabId === null ? this.moment : withoutTab(this.moment, withTabId);
		const entry: ListEntry = {
			kind: "group",
			id: group.id,
		};
		return {
			...this.moment,
			lists: withEntryBefore(layout.lists, chatId, entry, this.groupBeforeOf(chatId, withTabId)),
			groups: [...layout.groups, group],
			minted: this.moment.minted + 1,
		};
	}

	private groupBeforeOf(chatId: string, withTabId: string | null): string | null {
		const location = withTabId === null ? null : locationOf(this.moment, withTabId);

		if (location === null || location.groupId !== null) {
			return null;
		}

		return this.moment.lists[chatId]?.[location.at + 1]?.id ?? null;
	}

	private layoutWithGroup(next: TabGroup): TabLayout {
		return {
			...this.moment,
			groups: this.moment.groups.map((one) => (one.id === next.id ? next : one)),
		};
	}

	private closedOf(tab: HostTab, page: TabPage | null): ClosedTab {
		return {
			tab: {
				...tab,
				pageId: page?.pageId ?? tab.pageId,
			},
			...closedPlaceOf(locationOf(this.moment, tab.id)),
			address: page?.address ?? "",
		};
	}

	private closedMoment(ids: readonly string[], pages: ReadonlyMap<string, TabPage>): HostTabsMoment {
		const closing = ids.map((id) => this.tabOf(id));
		const closingIds = new Set(ids);
		const layout = closing.reduce<TabLayout>((kept, tab) => withoutTab(kept, tab.id), this.moment);
		return {
			...this.moment,
			...layout,
			tabs: this.moment.tabs.filter((tab) => !closingIds.has(tab.id)),
			shownId: this.shownAfterClosing(closingIds),
			closed: keptClosed(
				this.moment.closed,
				closing.map((tab) => this.closedOf(tab, pages.get(tab.id) ?? null)),
			),
		};
	}

	private shownAfterClosing(closingIds: ReadonlySet<string>): string | null {
		const { shownId } = this.moment;

		if (shownId === null || !closingIds.has(shownId)) {
			return shownId;
		}

		return this.neighbourOf(shownId, closingIds);
	}

	private neighbourOf(id: string, leaving: ReadonlySet<string>): string | null {
		const chatId = locationOf(this.moment, id)?.chatId;

		if (chatId === undefined) {
			return null;
		}

		const ids = flatTabIdsOf(this.moment, chatId);
		const at = ids.indexOf(id);
		const isStaying = (one: string): boolean => !leaving.has(one);
		return ids.slice(at + 1).find(isStaying) ?? ids.slice(0, at).reverse().find(isStaying) ?? null;
	}

	private becomeLayout(layout: TabLayout, reason: string): void {
		this.become(
			{
				...this.moment,
				...layout,
			},
			reason,
		);
	}

	private become(next: HostTabsMoment, reason: string): void {
		const was = this.moment;
		console.info(
			`[widgetarium] host tabs ${was.tabs.length} tabs, ${was.groups.length} groups, shown ${was.shownId} → ${next.tabs.length} tabs, ${next.groups.length} groups, shown ${next.shownId} (${reason})`,
		);
		this.moment = next;
		this.watchers.tell();
	}
}

export function chatOfTab(moment: HostTabsMoment, tabId: string): string | null {
	return locationOf(moment, tabId)?.chatId ?? null;
}

export { chatOfGroup, flatTabIdsOf };
