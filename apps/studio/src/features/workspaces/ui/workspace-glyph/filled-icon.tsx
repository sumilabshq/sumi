import { createElement as h, useId } from "react";
import type { ReactElement } from "react";
import { FILLED_ICONS } from "../../lib/filled-icons.js";

const MASKED =
	'<mask id="{id}" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#000000"></rect>{body}</mask><rect width="24" height="24" fill="currentColor" mask="url(#{id})"></rect>';

export function FilledIcon({ name }: { readonly name: string }): ReactElement | null {
	const id = `wg-ws-mask-${useId().replaceAll(":", "")}`;
	const body = FILLED_ICONS[name];
	if (body === undefined) {
		return null;
	}

	return (
		<svg
			className="wg-ws-filled"
			viewBox="0 0 24 24"
			aria-hidden="true"
			dangerouslySetInnerHTML={{ __html: MASKED.replaceAll("{id}", id).replace("{body}", body) }}
		/>
	);
}
