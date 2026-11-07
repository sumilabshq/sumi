import { z } from "zod";
import type { DocKind, HeldDoc } from "@widgetarium/behaviors/tauri-store";
import type { AppPage } from "../../shared/schema/page.schema.js";
import { EMPTY_PAGE, PagesGateway } from "./pages.gateway.js";

const KeptTitleSchema = z.object({
	title: z.string().nullable(),
	favicon: z.string().nullable(),
});

export const KeptPagesSchema = z.looseObject({
	titles: z.record(z.string(), KeptTitleSchema).catch({}),
});

export type KeptPages = z.infer<typeof KeptPagesSchema>;

export const KEPT_PAGES: DocKind<KeptPages> = {
	file: "pages.json",
	v: 1,
	schema: KeptPagesSchema,
};

const MOST_TITLES_KEPT = 500;

export class KeptPagesGateway extends PagesGateway {
	private readonly live = new Map<string, AppPage>();
	private minted = 0;

	constructor(private readonly kept: HeldDoc<KeptPages>) {
		super();
	}

	override page(tabId: string): AppPage {
		const titled = this.kept.now().titles[tabId];
		return {
			...(this.live.get(tabId) ?? EMPTY_PAGE),
			title: titled?.title ?? null,
			favicon: titled?.favicon ?? null,
		};
	}

	override savePage(tabId: string, page: AppPage, reason: string): void {
		this.live.set(tabId, page);
		const { titles } = this.kept.now();
		const was = titles[tabId];

		if (was?.title === page.title && was.favicon === page.favicon) {
			return;
		}

		const { [tabId]: _replaced, ...others } = titles;
		const kept = Object.entries({ ...others, [tabId]: { title: page.title, favicon: page.favicon } });
		this.kept.change({ titles: Object.fromEntries(kept.slice(-MOST_TITLES_KEPT)) }, `apps ${reason}`);
	}

	override mintedPresses(): number {
		return this.minted;
	}

	override savePressesMinted(minted: number): void {
		this.minted = minted;
	}

	override pagesChanged(listener: () => void): () => void {
		return this.kept.watch(listener);
	}
}
