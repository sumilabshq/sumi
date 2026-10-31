import { STORAGE_SERVICE, StorageAskSchema } from "@sumi/contract";
import type { ServiceHandler } from "@sumi/contract";
import type { StartedApp } from "@widgetarium/core/requests";
import { keptBoardDocOf } from "@widgetarium/tasks/module";
import type { AppDoc } from "@widgetarium/tasks/module";
import { z } from "zod";

type FrameSend = StartedApp["send"];

const NOT_KEPT = 'Sumi keeps no "{key}" for {app}';
const WRONG_SHAPE = '"{service}" was asked with the wrong shape: {issues}';

const SHELL_DOCS: ReadonlyMap<string, ReadonlyMap<string, (send: FrameSend) => AppDoc>> = new Map([
	["tasks", new Map([["tasks", keptBoardDocOf]])],
]);

export function frameStorageOf(app: string, send: FrameSend): ServiceHandler {
	return async (input) => {
		const ask = StorageAskSchema.safeParse(input);

		if (!ask.success) {
			return {
				ok: false,
				reason: WRONG_SHAPE.replace("{service}", STORAGE_SERVICE).replace("{issues}", z.prettifyError(ask.error)),
			};
		}

		const docOf = SHELL_DOCS.get(app)?.get(ask.data.key);

		if (docOf === undefined) {
			console.info(`[widgetarium] app ${app}: storage refused ${JSON.stringify(ask.data.key)}: kept nowhere`);
			return {
				ok: false,
				reason: NOT_KEPT.replace("{key}", ask.data.key).replace("{app}", app),
			};
		}

		const doc = docOf(send);
		return ask.data.op === "read" ? doc.read() : doc.write(ask.data.doc, ask.data.baseRev);
	};
}
