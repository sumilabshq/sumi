import { createElement as h, useId, useMemo } from "react";
import type { ReactElement } from "react";

const MASKED =
	'<mask id="{id}" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#000000"></rect>{body}</mask><rect width="24" height="24" fill="currentColor" mask="url(#{id})"></rect>';

export function FilledIcon({ body }: { readonly body: string }): ReactElement {
	const id = `sumi-ws-mask-${useId().replaceAll(":", "")}`;
	const markup = useMemo(() => ({ __html: MASKED.replaceAll("{id}", id).replace("{body}", body) }), [id, body]);
	return <svg className="sumi-ws-filled" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={markup} />;
}
