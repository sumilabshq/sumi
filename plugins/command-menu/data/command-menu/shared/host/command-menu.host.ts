import type { Send } from "@widgetarium/data-framework";
import type { Found, MenuDoor } from "../schema/command-menu.schema.js";

export type { Found };

export type Pools = Readonly<Record<string, readonly Found[]>>;

export interface Typed {
	readonly text: string;
	readonly lower: string;
	readonly isAddress: boolean;
	readonly isSumiLink: boolean;
	readonly host: string;
	readonly matched: string;
}

export interface Around {
	readonly workspaceName: string;
	readonly shownTitle: string;
}

export interface PageAsk {
	readonly pools: Pools;
	readonly findable: readonly Found[];
	readonly typed: Typed;
	readonly around: Around;
}

export interface Draft {
	readonly label: string;
	readonly layout: "list" | "grid";
	readonly rows: readonly Found[];
	readonly isFallback: boolean;
}

export interface DraftedMenu {
	readonly foundCount: number | null;
	readonly drafts: readonly Draft[];
}

export type DraftsOf = (ask: PageAsk) => DraftedMenu;

export type RowsOf = (send: Send) => Promise<readonly unknown[]>;

export type FilledDoor = Omit<MenuDoor, "keys">;

export interface FilledPage {
	readonly id: string;
	readonly draftsOf: DraftsOf;
}

export interface FilledRowSource {
	readonly id: string;
	readonly isFindable: boolean;
	readonly rowsOf: RowsOf;
}

export interface CommandMenuConfig {
	readonly doors: readonly FilledDoor[];
	readonly pages: readonly FilledPage[];
	readonly sources: readonly FilledRowSource[];
}
