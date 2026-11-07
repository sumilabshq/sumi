import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { flushSync } from "react-dom";

const OPEN_BODY_PX = 600;
const SHUT_BODY_PX = 60;

export function Expander({ id }: { readonly id: string }): ReactElement {
	const [isOpen, setOpen] = useState(true);
	return (
		<div>
			<button type="button" data-expander={id} onClick={() => flushSync(() => setOpen(!isOpen))}>
				expand
			</button>
			<div style={{ height: isOpen ? OPEN_BODY_PX : SHUT_BODY_PX }}>{id}</div>
		</div>
	);
}
