import { createElement as h, memo } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { ShowEssentialCommand } from "@widgetarium/app-host";
import type { EssentialTile as EssentialTileState } from "@widgetarium/app-host";
import { DropTint } from "../drop-tint/drop-tint.js";
import { TabFaceIcon } from "../tab-face/tab-face-icon.js";
import { LIFTED_HIDDEN, useLiftedMark } from "../../lib/tab-drag/lifted-look.js";

const TILE_RADIUS_PX = 14;
const TILE =
	"cv:relative cv:flex cv:[font:inherit] cv:text-inherit cv:h-[46px] cv:min-w-0 cv:cursor-default cv:items-center cv:justify-center cv:rounded-[14px] cv:border-0 cv:bg-(--sumi-essential) cv:p-0 cv:[box-shadow:none] cv:outline-none cv:select-none cv:transition-[background-color] cv:duration-(--sumi-dur-hover) cv:hover:bg-(--sumi-essential-hover) cv:hover:duration-0 cv:data-[shown]:bg-(--sumi-essential-on) cv:focus-visible:[box-shadow:inset_0_0_0_1.5px_var(--sumi-focus-ring)]";

export const EssentialTile = memo(function EssentialTile({
	tile,
}: {
	readonly tile: EssentialTileState;
}): ReactElement {
	const showEssential = useCommand(ShowEssentialCommand);
	const lifted = useLiftedMark(tile.id, null);
	return (
		<button
			type="button"
			aria-label={tile.title}
			aria-current={tile.isShown || undefined}
			className={TILE}
			onClick={() => void showEssential.run({ id: tile.id })}
			data-shown={tile.isShown || undefined}
			data-live={tile.isLive || undefined}
			data-tabs-item="essential"
			data-tabs-id={tile.id}
			data-tabs-lifted={lifted === null ? undefined : ""}
			style={lifted === null ? undefined : LIFTED_HIDDEN}
		>
			{lifted === null ? null : <DropTint isOn={lifted.isMarked} radius={TILE_RADIUS_PX} />}
			<TabFaceIcon icon={tile.icon} favicon={tile.favicon} title={tile.title} address={null} mark="none" size="tile" />
		</button>
	);
});
