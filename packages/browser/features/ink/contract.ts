import { z } from "zod";
import { PerCall, command } from "@widgetarium/core/requests";
import {
	OpenedPageSchema,
	PageContentSchema,
	PageRegionSchema,
	PageShotSchema,
} from "../../shared/schema/page-read.schema.js";
import { SearchWebSchema } from "../../shared/schema/search-web.schema.js";

export const ReadPageContentCommand = command("browser/read-page-content")
	.output(PageContentSchema)
	.idempotencyKey(PerCall);

export const CapturePageCommand = command("browser/capture-page")
	.input(z.object({ region: PageRegionSchema.nullable() }))
	.output(PageShotSchema)
	.idempotencyKey(PerCall);

export const InkOpenAddressCommand = command("browser/ink-open-address")
	.input(z.object({ url: z.string() }))
	.output(OpenedPageSchema)
	.idempotencyKey(PerCall);

export const SearchWebCommand = command("browser/search-web").input(SearchWebSchema).idempotencyKey(PerCall);

export const INK_REQUESTS = [ReadPageContentCommand, CapturePageCommand, InkOpenAddressCommand] as const;
