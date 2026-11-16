import { z } from "zod";
import type { DocKind, HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { ChoiceGateway } from "./choice.gateway.js";

export const KeptChoiceSchema = z.looseObject({
	chosen: z.string().nullable().catch(null),
});

export type KeptChoice = z.infer<typeof KeptChoiceSchema>;

export const KEPT_CHOICE: DocKind<KeptChoice> = {
	file: "home-page.json",
	v: 1,
	schema: KeptChoiceSchema,
};

export class KeptChoiceGateway extends ChoiceGateway {
	constructor(private readonly kept: Promise<HeldDoc<KeptChoice>>) {
		super();
	}

	override async keptChoice(): Promise<string | null> {
		return (await this.kept).now().chosen;
	}

	override async keepChoice(id: string, reason: string): Promise<void> {
		const kept = await this.kept;
		kept.change({ chosen: id }, reason);
		await kept.flush();
	}

	override choiceChanged(listener: () => void): () => void {
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
