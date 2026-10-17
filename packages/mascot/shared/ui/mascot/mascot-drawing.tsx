import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { MascotFrame } from "../../lib/mascot-motion.js";
import type { MascotScene, SceneIds } from "../../lib/scene/scene.js";
import { INK_BODY_PATH } from "../../lib/wardrobe/outfits.js";
import { SceneDefs } from "./scene-defs.js";
import { ScenePaths } from "./scene-paths.js";

export interface MascotDrawingProps {
	readonly scene: MascotScene;
	readonly ids: SceneIds;
	readonly frame: MascotFrame;
}

export function MascotDrawing({ scene, ids, frame }: MascotDrawingProps): ReactElement {
	return (
		<svg className="wg-mascot-svg" viewBox="0 0 120 120" aria-hidden="true">
			<SceneDefs ids={ids} frame={frame} paints={scene.paints} />
			<ScenePaths items={scene.behind} />
			<path d={INK_BODY_PATH} fill={`url(#${ids.shine})`} />
			<ScenePaths items={scene.hats} />
			<g className="wg-mascot-turn" style={{ transform: scene.leftEye }}>
				<g className="wg-mascot-lid">
					<path className="wg-mascot-eye is-left" />
				</g>
			</g>
			<g className="wg-mascot-turn" style={{ transform: scene.rightEye }}>
				<g className="wg-mascot-lid">
					<path className="wg-mascot-eye is-right" />
				</g>
			</g>
			<g className="wg-mascot-turn" style={{ transform: scene.mouth }}>
				<path className="wg-mascot-mouth" />
			</g>
			<ScenePaths items={scene.ahead} />
		</svg>
	);
}
