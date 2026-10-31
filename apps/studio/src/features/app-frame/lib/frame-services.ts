import { STORAGE_SERVICE } from "@sumi/contract";
import type { AnswerResult } from "@sumi/contract";
import type { StartedApp } from "@widgetarium/core/requests";
import { frameStorageOf } from "./frame-storage.js";

export type FrameAsk = (service: string, input: unknown) => Promise<AnswerResult>;

const UNKNOWN_SERVICE = 'Sumi has no service "{service}" yet';

export function frameServicesOf(app: string, send: StartedApp["send"]): FrameAsk {
	const storage = frameStorageOf(app, send);
	return (service, input) => (service === STORAGE_SERVICE ? storage(input) : Promise.resolve(unknownService(service)));
}

function unknownService(service: string): AnswerResult {
	return {
		ok: false,
		reason: UNKNOWN_SERVICE.replace("{service}", service),
	};
}
