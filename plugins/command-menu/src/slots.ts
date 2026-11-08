import { z } from "zod";
import { DoorStartSchema } from "@sumi/command-menu/contract";
import type { DraftsOf, RowsOf } from "@sumi/command-menu/implementation";
import { slot } from "@widgetarium/plugin-framework";

export type { Draft, DraftedMenu, Found, PageAsk } from "@sumi/command-menu/implementation";

const NOT_DRAFTS_OF = "a menu page is a function of the typed text and the rows found, answering the sections it draws";
const NOT_ROWS_OF = "a row source is a function of send, answering the rows it adds to the menu";

export const MenuDoorFillSchema = z.object({
	letter: z.string().regex(/^[a-z]$/),
	label: z.string().nullable(),
	placeholder: z.string(),
	startsWith: DoorStartSchema,
});

export const menuDoors = slot().item(MenuDoorFillSchema).list();

export const MenuPageFillSchema = z.object({
	draftsOf: z.custom<DraftsOf>((value) => typeof value === "function", NOT_DRAFTS_OF),
});

export const menuPages = slot().item(MenuPageFillSchema).list();

export const MenuRowSourceFillSchema = z.object({
	isFindable: z.boolean(),
	rowsOf: z.custom<RowsOf>((value) => typeof value === "function", NOT_ROWS_OF),
});

export const menuRowSources = slot().item(MenuRowSourceFillSchema).list();
