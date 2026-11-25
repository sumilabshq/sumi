import { createElement as h, Fragment } from "react";
import type { ReactNode } from "react";
import { Kbd } from "./kbd";

export function withKeyHint(children: ReactNode, key: string, asChild: boolean | undefined): ReactNode {
	if (asChild) {
		return children;
	}

	return (
		<Fragment>
			{children}
			<Kbd aria-hidden="true">{key}</Kbd>
		</Fragment>
	);
}
