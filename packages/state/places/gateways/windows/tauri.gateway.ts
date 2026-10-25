import { z } from "zod";
import type { HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { WindowsSchema } from "../../shared/schema/windows.schema.js";
import type { MoveWindows, Windows, WindowsMoved } from "../../shared/schema/windows.schema.js";
import { WindowsGateway } from "./windows.gateway.js";

export const KeptPlacesSchema = z.looseObject({
	places: WindowsSchema.nullable().catch(null),
});

export type KeptPlaces = z.infer<typeof KeptPlacesSchema>;

const NONE_OPEN: Windows = { windows: [] };

export class TauriWindowsGateway extends WindowsGateway {
	constructor(private readonly kept: Promise<HeldDoc<KeptPlaces>>) {
		super();
	}

	override async windows(): Promise<Windows> {
		return (await this.kept).now().places ?? NONE_OPEN;
	}

	override async moveWindows(move: MoveWindows): Promise<WindowsMoved | null> {
		const kept = await this.kept;
		const moved = move(kept.now().places ?? NONE_OPEN);

		if (moved === null) {
			return null;
		}

		kept.change({ places: moved.windows }, `places ${moved.reason}`);
		await kept.flush();
		return moved;
	}

	override windowsChanged(listener: () => void): () => void {
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
