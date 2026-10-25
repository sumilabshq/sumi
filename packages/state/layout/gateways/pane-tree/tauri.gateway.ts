import { z } from "zod";
import type { HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { isSameView, leavesOf } from "../../shared/lib/pane-nodes.js";
import { stampsAfter, treeHeldBy } from "../../shared/lib/window-trees.js";
import type { HeldStamps, KeptWindow, WindowTree } from "../../shared/lib/window-trees.js";
import type { PaneTree, PaneView } from "../../shared/schema/pane-tree.schema.js";
import { KeptPaneTreeSchema, PaneTreeGateway } from "./pane-tree.gateway.js";

const REFUSED = "[widgetarium] kept panes refused, so the board starts from the first panes";
const MAIN_WINDOW = "main";
const MAIN_KEY = "panes";
const WINDOW_KEY = "panes:";
const HELD_KEY = "held:";
const HeldStampsSchema = z.record(z.string(), z.number());

export const KeptPanesSchema = z.object({
	panes: KeptPaneTreeSchema.nullable()
		.default(null)
		.catch(({ error }) => {
			console.warn(REFUSED, error.issues);
			return null;
		}),
});

export type KeptPanes = z.infer<typeof KeptPanesSchema>;

export type WindowsPanes = Readonly<Record<string, unknown>>;

export interface PaneWindow {
	readonly label: string;
	readonly first: PaneTree;
	readonly boot: PaneView | null;
}

export class TauriPaneTreeGateway extends PaneTreeGateway {
	private hasMetBoot = false;

	constructor(
		private readonly session: HeldDoc<WindowsPanes>,
		private readonly window: PaneWindow,
	) {
		super();
		session.watch(() => this.dropLost());
	}

	tree(): PaneTree {
		const kept = this.ownKept();

		if (kept === null) {
			return this.window.first;
		}

		if (!this.hasMetBoot && !this.holdsBoot(kept.tree)) {
			return this.window.first;
		}

		this.hasMetBoot = true;
		return treeHeldBy(kept, this.othersKept());
	}

	elsewhere(): readonly WindowTree[] {
		const all = this.othersKept();
		const own = this.ownKept();
		return all.map((other) => ({
			window: other.window,
			tree: treeHeldBy(other, [...all.filter((one) => one !== other), ...(own === null ? [] : [own])]),
		}));
	}

	saveOwnTree(tree: PaneTree, reason: string): void {
		const was = this.ownKept() ?? { window: this.window.label, tree: this.window.first, stamps: {} };
		this.session.change(
			{
				[keyOf(this.window.label)]: tree,
				[heldKeyOf(this.window.label)]: stampsAfter(was, tree, this.nextStamp()),
			},
			`panes ${reason}`,
		);
		void this.session.flush();
	}

	forgetOwnWindow(reason: string): Promise<void> {
		this.session.change({ [keyOf(this.window.label)]: null, [heldKeyOf(this.window.label)]: null }, reason);
		return this.session.flush();
	}

	forgetWindowsExcept(alive: readonly string[], reason: string): void {
		const dead = this.othersKept()
			.map((other) => other.window)
			.filter((window) => !alive.includes(window));

		if (dead.length === 0) {
			return;
		}

		console.info(`[widgetarium] panes of windows ${dead.join(", ")} → none (${reason})`);
		this.session.change(
			Object.fromEntries(
				dead.flatMap((window) => [
					[keyOf(window), null],
					[heldKeyOf(window), null],
				]),
			),
			reason,
		);
		void this.session.flush();
	}

	isLoaded(): boolean {
		return this.session.isRead();
	}

	treeChanged(listener: () => void): () => void {
		return this.session.watch(listener);
	}

	private dropLost(): void {
		const kept = this.ownKept();

		if (kept === null || !this.isLoaded() || !this.hasMetBoot) {
			return;
		}

		const held = treeHeldBy(kept, this.othersKept());

		if (held !== kept.tree) {
			this.saveOwnTree(held, "drop what another window took later");
		}
	}

	private nextStamp(): number {
		const own = this.ownKept();
		const all = [...this.othersKept(), ...(own === null ? [] : [own])];
		const latest = Math.max(0, ...all.flatMap((kept) => Object.values(kept.stamps)));
		return Math.max(Date.now(), latest + 1);
	}

	private ownKept(): KeptWindow | null {
		return keptIn(this.session.now(), this.window.label);
	}

	private othersKept(): readonly KeptWindow[] {
		const doc = this.session.now();
		return Object.keys(doc).flatMap((key) => {
			const window = windowOf(key);
			const kept = window === null || window === this.window.label ? null : keptIn(doc, window);
			return kept === null ? [] : [kept];
		});
	}

	private holdsBoot(kept: PaneTree): boolean {
		const { boot } = this.window;
		return boot === null || leavesOf(kept.root).some((leaf) => isSameView(leaf.view, boot));
	}
}

function keptIn(doc: WindowsPanes, window: string): KeptWindow | null {
	const tree = treeIn(doc[keyOf(window)]);
	return tree === null ? null : { window, tree, stamps: stampsIn(doc[heldKeyOf(window)]) };
}

function stampsIn(value: unknown): HeldStamps {
	const parsed = HeldStampsSchema.safeParse(value);
	return parsed.success ? parsed.data : {};
}

function heldKeyOf(label: string): string {
	return `${HELD_KEY}${label}`;
}

function keyOf(label: string): string {
	return label === MAIN_WINDOW ? MAIN_KEY : `${WINDOW_KEY}${label}`;
}

function windowOf(key: string): string | null {
	if (key === MAIN_KEY) {
		return MAIN_WINDOW;
	}

	return key.startsWith(WINDOW_KEY) ? key.slice(WINDOW_KEY.length) : null;
}

function treeIn(value: unknown): PaneTree | null {
	if (value === null || value === undefined) {
		return null;
	}

	const parsed = KeptPaneTreeSchema.safeParse(value);

	if (!parsed.success) {
		console.warn(REFUSED, parsed.error.issues);
		return null;
	}

	return parsed.data;
}
