import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { DrawingQuery } from "../../../../features/field/contract.js";
import type { Frame } from "../../../schema/regions.schema.js";
import { GpuScreen } from "./gpu-screen.js";

const BOARD_NOT_ON_GPU = "a whole board is not drawn on the GPU yet; only widget states are";

export function ScreenFrame({ frame }: { readonly frame: Frame }): ReactElement {
	const { registry } = useQuery(DrawingQuery).data;
	return (
		<div
			className="wg-design-frame cv:flex cv:flex-col cv:gap-3 cv:[contain:layout_paint]"
			data-canvas-frame={frame.widget ?? undefined}
			style={{ width: frame.width }}
		>
			<div className="cv:flex cv:min-h-9 cv:items-center cv:justify-between cv:gap-3">
				<span className="wg-design-name cv:text-lg cv:font-semibold cv:text-muted-foreground">{frame.label}</span>
				{frame.situation ? <span className="cv:text-base cv:text-muted-foreground">{frame.situation}</span> : null}
			</div>
			<GpuScreen
				id={frame.frame}
				label={frame.label}
				width={frame.width}
				minHeight={frame.height}
				picture={frame.picture}
				unpictured={frame.refusal || BOARD_NOT_ON_GPU}
				registry={registry}
			/>
		</div>
	);
}
