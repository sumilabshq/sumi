import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { MascotFrame } from "../../lib/mascot-motion.js";
import type { ScenePaint, SceneIds } from "../../lib/scene/scene.js";
import { INK_BODY_PATH } from "../../lib/wardrobe/outfits.js";

export interface SceneDefsProps {
	readonly ids: SceneIds;
	readonly frame: MascotFrame;
	readonly paints: readonly ScenePaint[];
}

export function SceneDefs({ ids, frame, paints }: SceneDefsProps): ReactElement {
	const [x, y] = frame.look;
	return (
		<defs>
			<radialGradient
				id={ids.shine}
				gradientUnits="userSpaceOnUse"
				cx={(16 + 88 * (0.42 - x * 0.18)).toFixed(2)}
				cy={(26 + 86 * (0.36 - y * 0.14)).toFixed(2)}
				r="66"
			>
				<stop offset="0" className="wg-mascot-body-light" />
				<stop offset="0.6" className="wg-mascot-body-base" />
				<stop offset="1" className="wg-mascot-body-dark" />
			</radialGradient>
			<clipPath id={ids.clip}>
				<path d={INK_BODY_PATH} />
			</clipPath>
			{paints.map((paint) => (
				<linearGradient
					key={paint.id}
					id={paint.id}
					gradientUnits="userSpaceOnUse"
					x1={paint.x1}
					y1={paint.y1}
					x2={paint.x2}
					y2={paint.y2}
				>
					<stop offset="0" stopColor={paint.light} />
					<stop offset="0.45" stopColor={paint.base} />
					<stop offset="1" stopColor={paint.dark} />
				</linearGradient>
			))}
		</defs>
	);
}
