import { isObject } from "@widgetarium/framework/is-object";

export function failureMessage(failure: unknown): string {
	const message = isObject(failure) ? failure["message"] : undefined;
	return String(message ?? failure);
}
