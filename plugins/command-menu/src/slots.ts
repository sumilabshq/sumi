import { z } from "zod";
import { DoorStartSchema } from "@sumi/command-menu";
import type { DraftsOf, RowsOf } from "@sumi/command-menu/module";
import { slot } from "@widgetarium/plugin-framework";

const NOT_DRAFTS_OF = "a menu page is a function of the typed text and the rows found, answering the sections it draws";
const NOT_ROWS_OF = "a row source is a function of send, answering the rows it adds to the menu";

export const MenuDoorFillSchema = z.object({
	letter: z.string().regex(/^[a-z]$/),
	label: z.string().nullable(),
	placeholder: z.string(),
	startsWith: DoorStartSchema,
});

export const MenuDoorsSlot = slot("menu-doors").item(MenuDoorFillSchema).list();

export const MenuPageFillSchema = z.object({
	draftsOf: z.custom<DraftsOf>((value) => typeof value === "function", NOT_DRAFTS_OF),
});

export const MenuPagesSlot = slot("menu-pages").item(MenuPageFillSchema).list();

export const MenuRowSourceFillSchema = z.object({
	isFindable: z.boolean(),
	rowsOf: z.custom<RowsOf>((value) => typeof value === "function", NOT_ROWS_OF),
});

export const MenuRowSourcesSlot = slot("menu-row-sources").item(MenuRowSourceFillSchema).list();
