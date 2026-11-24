import { z } from "zod";
import type { DocKind, HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { AppTileSchema } from "../../shared/schema/arrangement.schema.js";
import type { Arrangement } from "../../shared/schema/arrangement.schema.js";
import { ArrangementGateway } from "./arrangement.gateway.js";

export const KeptArrangementSchema = z.looseObject({
	setupIds: z.array(z.string().min(1)).catch([]),
	apps: z.array(AppTileSchema).catch([]),
	hiddenApps: z.array(z.string().min(1)).catch([]),
});

export type KeptArrangement = z.infer<typeof KeptArrangementSchema>;

export const KEPT_ARRANGEMENT: DocKind<KeptArrangement> = {
	file: "home-layout.json",
	v: 1,
	schema: KeptArrangementSchema,
};

export class KeptArrangementGateway extends ArrangementGateway {
	constructor(private readonly kept: Promise<HeldDoc<KeptArrangement>>) {
		super();
	}

	override async arrangement(): Promise<Arrangement> {
		const { setupIds, apps, hiddenApps } = (await this.kept).now();
		return { setupIds, apps, hiddenApps };
	}

	override async keepArrangement(patch: Partial<Arrangement>, reason: string): Promise<void> {
		const kept = await this.kept;
		kept.change(patch, reason);
		await kept.flush();
	}

	override arrangementChanged(listener: () => void): () => void {
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
