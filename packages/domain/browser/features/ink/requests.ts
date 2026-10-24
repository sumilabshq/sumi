import { PerCall, command } from "@widgetarium/core/requests";
import { searchAddressOf } from "../../shared/lib/search-address.js";
import {
	CapturePageSchema,
	InkAddressSchema,
	OpenedPageSchema,
	PageContentSchema,
	PageShotSchema,
} from "../../shared/schema/page-read.schema.js";
import { SearchWebSchema } from "../../shared/schema/search-web.schema.js";
import {
	INK_GATE,
	arrivalAllowed,
	changeActivity,
	fadeReading,
	inspected,
	navigationAllowed,
	readAllowed,
	stillAllowed,
} from "./lib/ink-gate.js";
import { refuseReportedRead } from "./lib/read-refusals.js";

export const ReadPageContentCommand = command("read-page-content")
	.output(PageContentSchema)
	.idempotencyKey(PerCall)
	.inject(INK_GATE)
	.handle(async (_input, gate) => {
		const read = await readAllowed(gate, "content");

		try {
			const captured = await gate.browserPages.content(read.tabId);
			await stillAllowed(gate, read, refuseReportedRead(read, captured));
			const content = inspected(gate, read, captured);
			changeActivity(gate, { contentReadAt: gate.clock.now() }, "ink read the page content");
			return content;
		} finally {
			fadeReading(gate);
		}
	});

export const CapturePageCommand = command("capture-page")
	.input(CapturePageSchema)
	.output(PageShotSchema)
	.idempotencyKey(PerCall)
	.inject(INK_GATE)
	.handle(async ({ region }, gate) => {
		const read = await readAllowed(gate, "screenshot");

		try {
			const shot = await gate.browserPages.capture(read.tabId, region);
			// TRADE-OFF: no OCR; an image is judged only by the field probe right after capture.
			await stillAllowed(gate, read, null);
			changeActivity(gate, { contentReadAt: gate.clock.now() }, "ink read the page content");
			return shot;
		} finally {
			fadeReading(gate);
		}
	});

export const InkOpenAddressCommand = command("ink-open-address")
	.input(InkAddressSchema)
	.output(OpenedPageSchema)
	.idempotencyKey(PerCall)
	.inject(INK_GATE)
	.handle(async ({ url }, gate) => {
		const navigation = await navigationAllowed(gate, url, gate.browserPages.shownId());
		const { tabId } = navigation;
		gate.browserPages.show(tabId);
		changeActivity(gate, { reading: { tabId, kind: "navigate" } }, "ink opens an address");

		try {
			gate.browserPages.open(tabId, navigation.url);
			await gate.browserPages.settled(tabId);
			return {
				tabId,
				url: await arrivalAllowed(gate, navigation),
			};
		} finally {
			fadeReading(gate);
		}
	});

export const SearchWebCommand = command("search-web")
	.input(SearchWebSchema)
	.idempotencyKey(PerCall)
	.inject(INK_GATE)
	.handle(async ({ text, heldTabId }, gate) => {
		const navigation = await navigationAllowed(gate, searchAddressOf(text), heldTabId ?? gate.browserPages.shownId());
		gate.browserPages.open(navigation.tabId, navigation.url);
	});
