import { createElement as h, Fragment } from "react";
import type { PointerEvent, ReactElement, ReactNode } from "react";
import { Icon } from "@widgetarium/kit";
import { useIsHomeEditing } from "../../lib/home-editing-context.js";
import { TILE_ATTRIBUTE } from "../../lib/use-sortable.js";

export interface TileChromeProps {
	readonly id: string;
	readonly label: string;
	readonly isLifted: boolean;
	readonly span?: number;
	readonly onGrip: (event: PointerEvent<HTMLElement>) => void;
	readonly onRemove: () => void;
	readonly onResize?: (event: PointerEvent<HTMLElement>) => void;
	readonly children: ReactNode;
}

const HANDLE_PX = 12;

export function TileChrome({ id, label, isLifted, span, onGrip, onRemove, onResize, children }: TileChromeProps): ReactElement {
	const isEditing = useIsHomeEditing();
	return (
		<div
			{...{ [TILE_ATTRIBUTE]: id }}
			className="sumi-home-tile"
			style={span === undefined ? undefined : { gridColumn: `span ${span}` }}
			data-editing={isEditing ? "" : undefined}
			data-lifted={isLifted ? "" : undefined}
		>
			{children}
			{isEditing ? (
				<>
					<span className="sumi-home-grip" role="button" aria-label={`Move ${label}`} onPointerDown={onGrip}>
						<Icon name="grip-vertical" size={HANDLE_PX} />
					</span>
					<button type="button" className="sumi-home-remove" aria-label={`Remove ${label}`} onClick={onRemove}>
						<Icon name="x" size={HANDLE_PX} />
					</button>
					{onResize === undefined ? null : (
						<span className="sumi-home-resize" role="button" aria-label={`Resize ${label}`} onPointerDown={onResize}>
							<Icon name="corner-down-right" size={HANDLE_PX} />
						</span>
					)}
				</>
			) : null}
		</div>
	);
}
