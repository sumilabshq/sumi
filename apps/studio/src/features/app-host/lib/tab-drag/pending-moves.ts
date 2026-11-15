import { createContext, useContext } from "react";
import type { TabDrop, TabsSidebar } from "@widgetarium/app-host/contract";
import { arrangedSidebar } from "./arranged-sidebar.js";
import type { Aimed } from "./arranged-sidebar.js";
import { arrangementKeyOf } from "./arrangement-key.js";
import { renameSource } from "./drag-source.js";
import type { DragSource } from "./drag-source.js";
import { measureSince } from "./drag-timing.js";
import { hasId, placedIdOf } from "./placed-ids.js";
import { renameDrop } from "./tab-drops.js";
import type { Rename } from "./tab-drops.js";

export type SendMove = (source: DragSource, drop: TabDrop) => Promise<boolean>;

export type QueueMove = (source: DragSource, drop: TabDrop) => void;

type Phase = "queued" | "sent" | "answered";

interface PendingMove {
	readonly source: DragSource;
	readonly drop: TabDrop;
	readonly askedAt: number;
}

interface AppliedMoves {
	readonly sidebar: TabsSidebar;
	readonly moves: readonly PendingMove[];
	readonly shown: TabsSidebar;
}

type RenameListener = (rename: Rename) => void;

const REFLECT_MOST_MS = 3000;
const RENAMES_KEPT = 64;
const RENAME_HOPS_MOST = 4;
const NO_PROVIDER = "[widgetarium] a sidebar move was asked outside the tabs sidebar";

export class PendingMoves {
	private moves: readonly PendingMove[] = [];
	private firstPhase: Phase = "queued";
	private readonly listeners = new Set<() => void>();
	private heardSidebar: TabsSidebar | null = null;
	private applied: AppliedMoves | null = null;
	private send: SendMove = sendNothing;
	private reflectTimer = 0;
	private readonly renames = new Map<string, string>();
	private tellRename: RenameListener = () => undefined;

	readonly subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	readonly queued = (): readonly PendingMove[] => this.moves;

	readonly queueMove: QueueMove = (source, drop) => {
		const askedAt = performance.now();
		const move = this.renameToCurrent({ source, drop, askedAt });
		const moves = [...this.moves, move];
		this.applied = this.applyAdded(moves, move);
		this.write(moves);
		requestAnimationFrame(() => measureSince("move-shown", askedAt));
		this.sendNext();
	};

	setSender(send: SendMove): void {
		this.send = send;
	}

	setRenameListener(tellRename: RenameListener): void {
		this.tellRename = tellRename;
	}

	hearSidebar(sidebar: TabsSidebar): void {
		this.heardSidebar = sidebar;
		this.dropReflected();
	}

	dispose(): void {
		window.clearTimeout(this.reflectTimer);
	}

	applyMovesTo(sidebar: TabsSidebar): TabsSidebar {
		if (this.moves.length === 0) {
			return sidebar;
		}

		if (this.applied?.sidebar !== sidebar || this.applied.moves !== this.moves) {
			this.applied = {
				sidebar,
				moves: this.moves,
				shown: this.moves.reduce((shown, move) => arrangedSidebar(shown, aimedOf(move)), sidebar),
			};
		}

		return this.applied.shown;
	}

	private renameToCurrent(move: PendingMove): PendingMove {
		const shown = this.applied?.moves === this.moves ? this.applied.shown : this.heardSidebar;
		let current = move;

		if (shown === null) {
			return move;
		}

		for (let hop = 0; hop < RENAME_HOPS_MOST; hop += 1) {
			const now = this.renames.get(current.source.id);

			if (now === undefined || hasId(shown, current.source.id)) {
				return current;
			}

			current = renameMove(current, { was: current.source.id, now });
		}

		return current;
	}

	private applyAdded(moves: readonly PendingMove[], added: PendingMove): AppliedMoves | null {
		const { applied } = this;

		if (applied === null || applied.moves !== this.moves || applied.sidebar !== this.heardSidebar) {
			return null;
		}

		return {
			sidebar: applied.sidebar,
			moves,
			shown: arrangedSidebar(applied.shown, aimedOf(added)),
		};
	}

	private sendNext(): void {
		const [first] = this.moves;

		if (first === undefined || this.firstPhase !== "queued") {
			return;
		}

		this.firstPhase = "sent";
		console.info(
			`[widgetarium] sidebar move of ${first.source.kind} ${first.source.id} queued → sent (${describeDrop(first.drop)})`,
		);
		void this.answerOf(first).then((isPlaced) => this.settleAnswer(isPlaced));
	}

	private answerOf({ source, drop }: PendingMove): Promise<boolean> {
		const sentAt = performance.now();
		return this.send(source, drop)
			.catch((failure: unknown) => {
				console.error(`[widgetarium] sidebar move of ${source.id} sent → failed`, failure);
				return false;
			})
			.then((isPlaced) => {
				measureSince("move-answered", sentAt);
				return isPlaced;
			});
	}

	private settleAnswer(isPlaced: boolean): void {
		if (!isPlaced) {
			this.undoFirst();
			return;
		}

		this.firstPhase = "answered";
		this.reflectTimer = window.setTimeout(() => this.dropFirst("not heard in time"), REFLECT_MOST_MS);
		this.dropReflected();
	}

	private undoFirst(): void {
		const [first, ...rest] = this.moves;

		if (first === undefined) {
			return;
		}

		console.warn(`[widgetarium] sidebar move of ${first.source.id} shown → undone (the move was refused)`);
		this.firstPhase = "queued";
		this.write(rest);
		this.sendNext();
	}

	// TODO: settle by a revision the command answers, not by re-applying the move
	private dropReflected(): void {
		const [first] = this.moves;
		const heard = this.heardSidebar;

		if (first === undefined || this.firstPhase !== "answered" || heard === null) {
			return;
		}

		if (arrangementKeyOf(arrangedSidebar(heard, aimedOf(first))) === arrangementKeyOf(heard)) {
			this.dropFirst("heard");
		}
	}

	private dropFirst(reason: string): void {
		window.clearTimeout(this.reflectTimer);
		const [first, ...rest] = this.moves;

		if (first === undefined) {
			return;
		}

		this.firstPhase = "queued";
		measureSince("move-settled", first.askedAt);
		console.info(
			`[widgetarium] sidebar move of ${first.source.id} shown → settled (${reason}), ${rest.length} waiting`,
		);
		this.write(this.renameWaiting(rest, first));
		this.sendNext();
	}

	private renameWaiting(waiting: readonly PendingMove[], settled: PendingMove): readonly PendingMove[] {
		const rename = this.heardSidebar === null ? null : renameOf(settled, this.heardSidebar);

		if (rename === null) {
			return waiting;
		}

		console.info(`[widgetarium] sidebar item ${rename.was} → ${rename.now} (its move settled)`);
		this.remember(rename);
		this.tellRename(rename);
		return waiting.map((move) => renameMove(move, rename));
	}

	private remember({ was, now }: Rename): void {
		this.renames.delete(now);
		this.renames.set(was, now);

		for (const oldest of [...this.renames.keys()].slice(0, Math.max(0, this.renames.size - RENAMES_KEPT))) {
			this.renames.delete(oldest);
		}
	}

	private write(moves: readonly PendingMove[]): void {
		this.moves = moves;
		this.listeners.forEach((listener) => listener());
	}
}

export const SidebarMovesContext = createContext<PendingMoves | null>(null);

export function useQueueMove(): QueueMove {
	const moves = useContext(SidebarMovesContext);

	if (moves === null) {
		throw new Error(NO_PROVIDER);
	}

	return moves.queueMove;
}

function sendNothing(): Promise<boolean> {
	return Promise.resolve(false);
}

function aimedOf({ source, drop }: PendingMove): Aimed {
	return {
		source,
		drop,
		isLanding: false,
	};
}

// TODO: take the new id from the command's answer, not from the heard sidebar
function renameOf(settled: PendingMove, heard: TabsSidebar): Rename | null {
	const was = settled.source.id;
	const now = placedIdOf(heard, settled.drop);
	return now === null || now === was || hasId(heard, was) ? null : { was, now };
}

function renameMove(move: PendingMove, rename: Rename): PendingMove {
	return {
		...move,
		source: renameSource(move.source, rename),
		drop: renameDrop(move.drop, rename),
	};
}

function describeDrop(drop: TabDrop): string {
	if (drop.kind === "essentials") {
		return `essentials at ${drop.at}`;
	}

	if (drop.kind === "list") {
		return `list ${drop.list}, group ${drop.groupId ?? "none"}, before ${drop.before ?? "the end"}`;
	}

	return drop.kind === "split" ? `split ${drop.splitId}, before ${drop.before ?? "the end"}` : "own window";
}
