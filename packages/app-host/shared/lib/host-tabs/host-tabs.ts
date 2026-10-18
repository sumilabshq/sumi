import type { AppKind } from "../../schema/app-tab.schema.js";
import { Watchers } from "../watchers/watchers.js";

export interface OpenedTab {
	readonly app: AppKind;
	readonly pageId: string | null;
	readonly isPinned: boolean;
}

export interface HostTab extends OpenedTab {
	readonly id: string;
	readonly label: string | null;
}

export interface ClosedTab {
	readonly tab: HostTab;
	readonly at: number;
}

export interface HostTabsMoment {
	readonly tabs: readonly HostTab[];
	readonly shownId: string | null;
	readonly minted: number;
	readonly closed: readonly ClosedTab[];
}

export const CLOSED_KEPT = 20;

const NO_TAB = 'the host holds no tab "{id}"';

export class HostTabs {
	private readonly watchers = new Watchers();
	private moment: HostTabsMoment = {
		tabs: [],
		shownId: null,
		minted: 0,
		closed: [],
	};

	constructor(opened: readonly OpenedTab[]) {
		for (const tab of opened) {
			this.open(tab);
		}
	}

	now = (): HostTabsMoment => this.moment;

	watch = (changed: () => void): (() => void) => this.watchers.watch(changed);

	private tabOf(id: string): HostTab {
		const found = this.moment.tabs.find((tab) => tab.id === id);

		if (!found) {
			throw new Error(NO_TAB.replace("{id}", id));
		}

		return found;
	}

	open(opened: OpenedTab): HostTab {
		return this.openAt(opened, groupEndOf(this.moment.tabs, opened.isPinned));
	}

	openAfter(afterId: string, opened: Omit<OpenedTab, "isPinned">): HostTab {
		const after = this.tabOf(afterId);
		return this.openAt(
			{
				...opened,
				isPinned: after.isPinned,
			},
			this.moment.tabs.indexOf(after) + 1,
		);
	}

	show(id: string): void {
		this.tabOf(id);

		if (this.moment.shownId === id) {
			return;
		}

		this.become(
			{
				...this.moment,
				shownId: id,
			},
			`show ${id}`,
		);
	}

	close(id: string): void {
		const closing = this.tabOf(id);
		this.become(
			{
				...this.moment,
				tabs: this.moment.tabs.filter((tab) => tab.id !== id),
				shownId: this.moment.shownId === id ? this.neighbourOf(id) : this.moment.shownId,
				closed: keptClosed(this.moment.closed, [this.closedOf(closing)]),
			},
			`close ${id}`,
		);
	}

	closeOthers(keptId: string): void {
		this.tabOf(keptId);
		const closing = this.moment.tabs.filter((tab) => tab.id !== keptId && !tab.isPinned);

		if (closing.length === 0) {
			return;
		}

		const closingIds = new Set(closing.map((tab) => tab.id));
		const { shownId } = this.moment;
		this.become(
			{
				...this.moment,
				tabs: this.moment.tabs.filter((tab) => !closingIds.has(tab.id)),
				shownId: shownId !== null && closingIds.has(shownId) ? keptId : shownId,
				closed: keptClosed(this.moment.closed, closing.map((tab) => this.closedOf(tab)).reverse()),
			},
			`close ${closing.length} tabs beside ${keptId}`,
		);
	}

	reopenClosed(): HostTab | null {
		const last = this.moment.closed.at(-1);

		if (!last) {
			return null;
		}

		const isPageTaken = this.moment.tabs.some((tab) => last.tab.pageId !== null && tab.pageId === last.tab.pageId);
		const tab = {
			...last.tab,
			pageId: isPageTaken ? null : last.tab.pageId,
		};
		const at = Math.min(last.at, this.moment.tabs.length);
		this.become(
			{
				...this.moment,
				tabs: placedIn(this.moment.tabs, tab, at),
				shownId: tab.id,
				closed: this.moment.closed.slice(0, -1),
			},
			`reopen ${tab.id} at ${at}`,
		);
		return tab;
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
				tabs: this.moment.tabs.map((tab) => (tab.id === id ? { ...tab, label } : tab)),
			},
			`rename ${id}, ${labelSaid(renamed.label)} → ${labelSaid(label)}`,
		);
	}

	move(id: string, beforeId: string | null, isPinned: boolean): void {
		const moved = this.tabOf(id);
		const before = beforeId === null ? null : this.tabOf(beforeId);
		const rest = this.moment.tabs.filter((tab) => tab.id !== id);
		const at = before !== null && before.isPinned === isPinned ? rest.indexOf(before) : groupEndOf(rest, isPinned);
		this.become(
			{
				...this.moment,
				tabs: placedIn(rest, { ...moved, isPinned }, at),
			},
			`move ${id} before ${beforeId ?? "the end"}, ${pinnedSaid(moved.isPinned)} → ${pinnedSaid(isPinned)}`,
		);
	}

	pin(id: string, isPinned: boolean): void {
		const pinned = this.tabOf(id);

		if (pinned.isPinned === isPinned) {
			return;
		}

		const rest = this.moment.tabs.filter((tab) => tab.id !== id);
		this.become(
			{
				...this.moment,
				tabs: placedIn(rest, { ...pinned, isPinned }, groupEndOf(rest, true)),
			},
			`pin ${id}, ${pinnedSaid(pinned.isPinned)} → ${pinnedSaid(isPinned)}`,
		);
	}

	private openAt(opened: OpenedTab, at: number): HostTab {
		const minted = this.moment.minted + 1;
		const tab = {
			...opened,
			id: `tab-${minted}`,
			label: null,
		};
		this.become(
			{
				...this.moment,
				tabs: placedIn(this.moment.tabs, tab, at),
				shownId: tab.id,
				minted,
			},
			`open ${tab.id} (${tab.app}) at ${at}`,
		);
		return tab;
	}

	private closedOf(tab: HostTab): ClosedTab {
		return {
			tab,
			at: this.moment.tabs.indexOf(tab),
		};
	}

	private neighbourOf(id: string): string | null {
		const { tabs } = this.moment;
		const at = tabs.findIndex((tab) => tab.id === id);
		return (tabs[at + 1] ?? tabs[at - 1])?.id ?? null;
	}

	private become(next: HostTabsMoment, reason: string): void {
		const was = this.moment;
		console.info(
			`[widgetarium] host tabs ${was.tabs.length} tabs, shown ${was.shownId}, ${was.closed.length} closed → ${next.tabs.length} tabs, shown ${next.shownId}, ${next.closed.length} closed (${reason})`,
		);
		this.moment = next;
		this.watchers.tell();
	}
}

function groupEndOf(tabs: readonly HostTab[], isPinned: boolean): number {
	return isPinned ? tabs.filter((tab) => tab.isPinned).length : tabs.length;
}

function placedIn(tabs: readonly HostTab[], tab: HostTab, at: number): readonly HostTab[] {
	return [...tabs.slice(0, at), tab, ...tabs.slice(at)];
}

function keptClosed(closed: readonly ClosedTab[], closing: readonly ClosedTab[]): readonly ClosedTab[] {
	return [...closed, ...closing].slice(-CLOSED_KEPT);
}

function pinnedSaid(isPinned: boolean): string {
	return isPinned ? "pinned" : "open";
}

function labelSaid(label: string | null): string {
	return label === null ? "no label" : `"${label}"`;
}
