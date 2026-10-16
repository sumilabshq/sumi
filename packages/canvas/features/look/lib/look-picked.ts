import { lookToWrite, readLook, withOptionPicked } from "@widgetarium/core/app-look.js";

export type LookTextPicked = { readonly text: string } | { readonly refusal: string };

const NOT_PICKED = "The look was not changed: {why}";

export function lookTextPicked(text: string, settingName: string, option: string): LookTextPicked {
	const was = readLook(text);
	if (was.refusal !== undefined) return { refusal: NOT_PICKED.replace("{why}", was.refusal) };
	const picked = withOptionPicked(was.value, settingName, option);
	if (picked.refusal !== undefined) return { refusal: NOT_PICKED.replace("{why}", picked.refusal) };
	return { text: lookToWrite(picked.value) };
}
