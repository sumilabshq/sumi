import type { Essential, KeptEssentials } from "../../schema/essential.schema.js";
import { Watchers } from "../watchers/watchers.js";

export type EssentialFace = Omit<Essential, "id">;

const NO_ESSENTIAL = 'no essential "{id}"';

export const FIRST_ESSENTIALS: readonly EssentialFace[] = [
	{
		app: "canvas",
		address: null,
		title: "Canvas",
		favicon: null,
	},
];

export class Essentials {
	private readonly watchers = new Watchers();
	private kept: KeptEssentials;

	constructor(kept: KeptEssentials | null) {
		this.kept = kept ?? {
			essentials: FIRST_ESSENTIALS.map((face, at) => ({
				...face,
				id: `essential-${at + 1}`,
			})),
			minted: FIRST_ESSENTIALS.length,
		};
	}

	now = (): KeptEssentials => this.kept;

	watch = (changed: () => void): (() => void) => this.watchers.watch(changed);

	heldEssentialOf(id: string): Essential {
		const found = this.kept.essentials.find((essential) => essential.id === id);

		if (!found) {
			throw new Error(NO_ESSENTIAL.replace("{id}", id));
		}

		return found;
	}

	add(face: EssentialFace, at: number): string {
		const id = `essential-${this.kept.minted + 1}`;
		const { essentials } = this.kept;
		this.become(
			{
				essentials: [...essentials.slice(0, at), { ...face, id }, ...essentials.slice(at)],
				minted: this.kept.minted + 1,
			},
			`add ${id} "${face.title}" at ${at}`,
		);
		return id;
	}

	move(id: string, at: number): void {
		const moved = this.heldEssentialOf(id);
		const rest = this.kept.essentials.filter((essential) => essential.id !== id);

		if (this.kept.essentials.indexOf(moved) === at) {
			return;
		}

		this.become(
			{
				...this.kept,
				essentials: [...rest.slice(0, at), moved, ...rest.slice(at)],
			},
			`move ${id} to ${at}`,
		);
	}

	remove(id: string): void {
		const removed = this.heldEssentialOf(id);
		this.become(
			{
				...this.kept,
				essentials: this.kept.essentials.filter((essential) => essential.id !== id),
			},
			`remove ${id} "${removed.title}"`,
		);
	}

	private become(next: KeptEssentials, reason: string): void {
		console.info(`[widgetarium] essentials ${this.kept.essentials.length} → ${next.essentials.length} (${reason})`);
		this.kept = next;
		this.watchers.tell();
	}
}
