import { Repeatable, refuse } from "@widgetarium/data-framework";
import type { Send } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { navigation } from "@widgetarium/navigation/contract";
import { studioCoreChanged } from "../../gateways/core-changes/core-changes.events.js";
import { peeksChanged } from "../../gateways/side-peeks/side-peeks.events.js";
import type { SidePeeksGateway } from "../../gateways/side-peeks/side-peeks.gateway.js";
import type { StudioWindowGateway } from "../../gateways/studio-window/studio-window.gateway.js";
import { FrameSideInputSchema, FrameSidesSchema } from "../../shared/schema/frame-sides.schema.js";
import type { FrameSide, SideLook } from "../../shared/schema/frame-sides.schema.js";
import { concealedLook, peekedLook, refuseTurn, toggledLook } from "./lib/side-looks.js";

interface SideReach {
	readonly send: Send;
	readonly studioWindow: StudioWindowGateway;
	readonly sidePeeks: SidePeeksGateway;
}

interface SideTurn {
	readonly side: FrameSide;
	readonly why: string;
	readonly turned: (look: SideLook) => SideLook;
}

export const frameSides = query()
	.public()
	.output(FrameSidesSchema)
	.handle(async (_input, reach) => ({ left: await lookOf(reach, "left") }));

export const toggle = command()
	.public()
	.input(FrameSideInputSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ side }, { invalidate, ...reach }) => {
		invalidate(frameSides);
		return turnSide(reach, { side, why: "toggle", turned: toggledLook });
	});

export const peek = command()
	.public()
	.input(FrameSideInputSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ side }, { invalidate, ...reach }) => {
		invalidate(frameSides);
		return turnSide(reach, { side, why: "peek", turned: peekedLook });
	});

export const conceal = command()
	.public()
	.input(FrameSideInputSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ side }, { invalidate, ...reach }) => {
		invalidate(frameSides);
		return turnSide(reach, { side, why: "conceal", turned: concealedLook });
	});

export const rereadSides = subscriber(peeksChanged).handle((_input, { invalidate }) => {
	invalidate(frameSides);
});

export const rereadSidesForCore = subscriber(studioCoreChanged).handle((_input, { invalidate }) => {
	invalidate(frameSides);
});

async function turnSide(reach: SideReach, { side, why, turned }: SideTurn): Promise<ReturnType<typeof refuse> | undefined> {
	const was = await lookOf(reach, side);
	const next = turned(was);

	if (next === was) {
		console.info(`[widgetarium] frame side ${side} ${why} skipped: ${was}`);
		return undefined;
	}

	const refusal = refuseTurn(was, next);

	if (refusal !== null) {
		return refuse(`frame side ${side} ${refusal} (${why})`);
	}

	reach.sidePeeks.setPeeking(side, next === "peeking");
	await reach.send(navigation.windowSides.hideLeft, {
		window: reach.studioWindow.placesWindow(),
		isHidden: next !== "docked",
	});
	console.info(`[widgetarium] frame side ${side} ${was} → ${next} (${why})`);
	return undefined;
}

async function lookOf({ send, studioWindow, sidePeeks }: SideReach, side: FrameSide): Promise<SideLook> {
	if (sidePeeks.isPeeking(side)) {
		return "peeking";
	}

	const { leftHidden } = await send(navigation.windowSides.sides, { window: studioWindow.placesWindow() });
	return leftHidden === true ? "hidden" : "docked";
}
