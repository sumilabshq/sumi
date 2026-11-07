import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import type { CardsAround } from "../../lib/chat-cards-slot.js";

export function CardsOnly({ around }: { readonly around: CardsAround }): ReactElement {
	return (
		<Fragment>
			{around.before}
			{around.after}
		</Fragment>
	);
}
