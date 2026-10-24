import type { KeptColumn } from "../../schema/tabs-column.schema.js";
import { Watchers } from "../watchers/watchers.js";

export class TabsColumnStore {
	private readonly watchers = new Watchers();

	constructor(private kept: KeptColumn) {}

	now = (): KeptColumn => this.kept;

	watch = (changed: () => void): (() => void) => this.watchers.watch(changed);

	become(next: KeptColumn, reason: string): void {
		const was = this.kept;

		if (JSON.stringify(was) === JSON.stringify(next)) {
			return;
		}

		console.info(`[widgetarium] tabs column ${JSON.stringify(was)} → ${JSON.stringify(next)} (${reason})`);
		this.kept = next;
		this.watchers.tell();
	}
}
