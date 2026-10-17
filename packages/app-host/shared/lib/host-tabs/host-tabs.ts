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
				tabs: [...this.moment.tabs, tab],
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

	move(id: string, beforeId: string | null): void {
		const moved = this.tabOf(id);
		const before = beforeId === null ? null : this.tabOf(beforeId);
		const rest = this.moment.tabs.filter((tab) => tab.id !== id);
		const at = before === null ? rest.length : rest.indexOf(before);
		const placed = {
			...moved,
			isPinned: before?.isPinned ?? false,
		};
		this.become(
			{
				...this.moment,
				tabs: [...rest.slice(0, at), placed, ...rest.slice(at)],
			},
			`move ${id} before ${beforeId ?? "the end"}`,
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
