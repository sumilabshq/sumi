import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SceneItem } from "../../lib/scene.js";

export interface ScenePathsProps {
	readonly items: readonly SceneItem[];
}

export function ScenePaths({ items }: ScenePathsProps): ReactElement {
	return (
		<g>
			{items.map((one, at) => (
				<path
					key={at}
					d={one.d}
					fill={one.fill}
					stroke={one.stroke}
					strokeWidth={one.width}
					opacity={one.opacity}
					clipPath={one.clip ?? undefined}
					fillRule={one.rule}
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			))}
		</g>
	);
}
