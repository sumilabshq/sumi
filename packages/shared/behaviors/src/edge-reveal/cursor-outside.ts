import type { RefObject } from "react";
import { EDGE_SIDES } from "./edge-intent.js";
import type { EdgeSide } from "./edge-intent.js";
import { revealIfTucked } from "./edge-reveal-ask.js";
import type { EdgeRevealAsk } from "./edge-reveal-ask.js";
import { REST_MS, isStill } from "./edge-rest.js";
import { isInKeepZone, isInOpenStrip, isInsideView } from "./edge-zones.js";
import type { ViewPoint, ViewSize } from "./edge-zones.js";

const POLL_MS = 50;

interface RestFrom {
	readonly at: ViewPoint;
	readonly sinceMs: number;
}

export class CursorOutside {
	private isFollowing = false;
	private isStopped = false;
	private restFrom: RestFrom | null = null;

	constructor(private readonly latest: RefObject<EdgeRevealAsk>) {}

	follow(crossedSide: EdgeSide | null): void {
		if (this.isFollowing) {
			return;
		}

		this.isFollowing = true;
		this.restFrom = null;
		void this.followUntilSettled(crossedSide)
			.catch((failure: unknown) =>
				console.error("[widgetarium] edge reveal lost the cursor outside the window", failure),
			)
			.finally(() => {
				this.isFollowing = false;
			});
	}

	stop(): void {
		this.isStopped = true;
	}

	private async followUntilSettled(crossedSide: EdgeSide | null): Promise<void> {
		let cursor = await this.latest.current.readCursor();

		if (cursor === null) {
			revealIfTucked(this.latest.current, crossedSide);
			return;
		}

		while (cursor !== null && !this.isStopped && this.stepOutside(cursor)) {
			cursor = await this.nextCursor();
		}
	}

	private async nextCursor(): Promise<ViewPoint | null> {
		await waited(POLL_MS);
		const cursor = await this.latest.current.readCursor();

		if (cursor === null) {
			console.warn("[widgetarium] edge reveal stopped following: the host stopped reporting the cursor");
		}

		return cursor;
	}

	private stepOutside(cursor: ViewPoint): boolean {
		const view = viewSize();

		if (isInsideView(cursor, view)) {
			return false;
		}

		return EDGE_SIDES.map((side) => this.stepSide(side, cursor, view)).includes(true);
	}

	private stepSide(side: EdgeSide, cursor: ViewPoint, view: ViewSize): boolean {
		const look = this.latest.current.sides[side];

		if (look === "out") {
			return this.concealUnlessKept(side, cursor);
		}

		return look === "tucked" && this.revealIfRestedInStrip(side, cursor, view);
	}

	private concealUnlessKept(side: EdgeSide, cursor: ViewPoint): boolean {
		const ask = this.latest.current;
		const panel = ask.panels[side].current;

		if (panel !== null && isInKeepZone(cursor, panel.getBoundingClientRect(), side)) {
			return true;
		}

		ask.conceal(side);
		return false;
	}

	private revealIfRestedInStrip(side: EdgeSide, cursor: ViewPoint, view: ViewSize): boolean {
		if (!isInOpenStrip(cursor, view, side)) {
			return false;
		}

		if (this.isRestedAt(cursor)) {
			this.latest.current.reveal(side);
		}

		return true;
	}

	private isRestedAt(cursor: ViewPoint): boolean {
		const nowMs = performance.now();

		if (this.restFrom === null || !isStill(this.restFrom.at, cursor)) {
			this.restFrom = {
				at: cursor,
				sinceMs: nowMs,
			};
			return false;
		}

		return nowMs - this.restFrom.sinceMs >= REST_MS;
	}
}

function viewSize(): ViewSize {
	return {
		widthPx: window.innerWidth,
		heightPx: window.innerHeight,
	};
}

function waited(ms: number): Promise<void> {
	return new Promise((done) => window.setTimeout(done, ms));
}
