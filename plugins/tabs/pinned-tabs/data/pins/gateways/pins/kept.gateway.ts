import { z } from "zod";
import type { DocKind, HeldDoc } from "@widgetarium/behaviors/tauri-store";
import type { PinsMove } from "../../shared/lib/pin-edits.js";
import { PinSchema } from "../../shared/schema/pins.schema.js";
import type { Pin } from "../../shared/schema/pins.schema.js";
import { PinsGateway } from "./pins.gateway.js";
import type { MovePins } from "./pins.gateway.js";

export const KeptPinsSchema = z.looseObject({
	pins: z.array(z.unknown()).catch([]),
});

export type KeptPins = z.infer<typeof KeptPinsSchema>;

export const KEPT_PINS: DocKind<KeptPins> = {
	file: "pins.json",
	v: 1,
	schema: KeptPinsSchema,
};

const UNREADABLE = "[pins] a pin in pins.json does not match its shape, so it is left out and kept in the file";

export class KeptPinsGateway extends PinsGateway {
	constructor(private readonly kept: Promise<HeldDoc<KeptPins>>) {
		super();
	}

	override async pins(): Promise<readonly Pin[]> {
		return readPins((await this.kept).now().pins);
	}

	override async movePins(move: MovePins): Promise<PinsMove | null> {
		const kept = await this.kept;
		const now = kept.now().pins;
		const moved = move(readPins(now));

		if (moved === null) {
			return null;
		}

		kept.change({ pins: [...unreadableOf(now), ...moved.pins] }, moved.reason);
		await kept.flush();
		return moved;
	}

	override pinsChanged(listener: () => void): () => void {
		const watching = {
			isStopped: false,
			stop: (): void => undefined,
		};
		void this.kept.then((kept) => {
			if (!watching.isStopped) {
				watching.stop = kept.watch(listener);
			}
		});
		return () => {
			watching.isStopped = true;
			watching.stop();
		};
	}
}

function readPins(kept: readonly unknown[]): readonly Pin[] {
	return kept.flatMap((one) => {
		const read = PinSchema.safeParse(one);

		if (!read.success) {
			console.warn(UNREADABLE, read.error.issues);
			return [];
		}

		return [read.data];
	});
}

function unreadableOf(kept: readonly unknown[]): readonly unknown[] {
	return kept.filter((one) => !PinSchema.safeParse(one).success);
}
