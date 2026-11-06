import { isObject } from "@widgetarium/data-framework/is-object";

export function failureMessage(failure: unknown): string {
	const message = isObject(failure) ? failure["message"] : undefined;
	return String(message ?? failure);
}
