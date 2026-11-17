import { z } from "zod";
import type { DocKind, HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { ViewIdSchema } from "../../shared/schema/views.schema.js";
import type { ViewId } from "../../shared/schema/views.schema.js";
import { ViewsGateway } from "./views.gateway.js";

export const KeptViewsSchema = z.looseObject({
	view: ViewIdSchema.nullable().catch(null),
});

export type KeptViews = z.infer<typeof KeptViewsSchema>;

export const KEPT_VIEWS: DocKind<KeptViews> = {
	file: "tab-views.json",
	v: 1,
	schema: KeptViewsSchema,
};

export class KeptViewsGateway extends ViewsGateway {
	constructor(private readonly kept: Promise<HeldDoc<KeptViews>>) {
		super();
	}

	override async chosen(): Promise<ViewId | null> {
		return (await this.kept).now().view;
	}

	override async choose(view: ViewId, reason: string): Promise<void> {
		const kept = await this.kept;
		kept.change({ ...kept.now(), view }, reason);
		await kept.flush();
	}

	override viewsChanged(listener: () => void): () => void {
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
