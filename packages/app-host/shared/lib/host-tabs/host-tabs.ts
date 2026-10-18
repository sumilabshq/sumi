import type { AppKind } from "../../schema/app-tab.schema.js";
import { Watchers } from "../watchers/watchers.js";

export interface OpenedTab {
	readonly app: AppKind;
	readonly pageId: string | null;
	readonly isPinned: boolean;
}

export interface HostTab extends OpenedTab {
	readonly id: string;
}

export interface HostTabsMoment {
	readonly tabs: readonly HostTab[];
	readonly shownId: string | null;
	readonly minted: number;
}

const NO_TAB = 'the host holds no tab "{id}"';

export class HostTabs {
	private readonly watchers = new Watchers();
	private moment: HostTabsMoment = {
		tabs: [],
		shownId: null,
		minted: 0,
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
		const minted = this.moment.minted + 1;
		const tab = {
			...opened,
			id: `tab-${minted}`,
		};
		this.become(
			{
				tabs: placedIn(this.moment.tabs, tab, groupEndOf(this.moment.tabs, tab.isPinned)),
				shownId: tab.id,
				minted,
			},
			`open ${tab.id} (${tab.app})`,
		);
		return tab;
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
		this.tabOf(id);
		const tabs = this.moment.tabs.filter((tab) => tab.id !== id);
		this.become(
			{
				...this.moment,
				tabs,
				shownId: this.moment.shownId === id ? this.neighbourOf(id) : this.moment.shownId,
			},
			`close ${id}`,
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

	private neighbourOf(id: string): string | null {
		const { tabs } = this.moment;
		const at = tabs.findIndex((tab) => tab.id === id);
		return (tabs[at + 1] ?? tabs[at - 1])?.id ?? null;
	}

	private become(next: HostTabsMoment, reason: string): void {
		const was = this.moment;
		console.info(
			`[widgetarium] host tabs ${was.tabs.length} tabs, shown ${was.shownId} → ${next.tabs.length} tabs, shown ${next.shownId} (${reason})`,
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

function pinnedSaid(isPinned: boolean): string {
	return isPinned ? "pinned" : "open";
}
