import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { PlateHeaderContext } from "../lib/plate-header-context.js";
import { PlateHeaderStore } from "../lib/plate-header-store.js";

export interface AppPlateProps {
	readonly name: string;
	readonly children: ReactNode;
}

export function AppPlate({ name, children }: AppPlateProps): ReactElement {
	const [store] = useState(() => new PlateHeaderStore());
	return (
		<main className="wg-app-plate" aria-label={name}>
			<PlateHeaderContext.Provider value={store}>
				<div className="wg-plate-head is-app" data-app-tools="">
					<div className="wg-plate-head-row wg-root">
						<span className="wg-plate-gap" />
						<span className="wg-plate-slot" data-plate-place="controls">
							<span className="wg-plate-target" ref={(element) => store.placeTarget("controls", element)} />
						</span>
					</div>
				</div>
				<div className="wg-app-plate-body">{children}</div>
			</PlateHeaderContext.Provider>
		</main>
	);
}
