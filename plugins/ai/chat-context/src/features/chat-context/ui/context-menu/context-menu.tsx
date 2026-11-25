import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import type { ChatContext, Editor } from "@sumi/chat-context/contract";
import { Button, Icon, Popover, PopoverContent, PopoverItem, PopoverSeparator, PopoverTrigger } from "@widgetarium/kit";

export const OPEN_IN = "Open in {editor}";
export const THIS_MAC = "This Mac";
export const CHOOSE_APP = "Choose app";

const ICON_PX = 14;

export interface ContextMenuProps {
	readonly context: ChatContext;
	readonly onReveal: () => void;
	readonly onOpenIn: (editor: Editor) => void;
}

export function ContextMenu({ context, onReveal, onOpenIn }: ContextMenuProps): ReactElement {
	return (
		<>
			<PopoverItem
				icon={<Icon name="folder" size={ICON_PX} />}
				keys={<span className="sumi-chat-context-path">{context.folder}</span>}
				onClick={onReveal}
			>
				{context.name}
			</PopoverItem>
			{context.branch === null ? null : (
				// TODO: switch branch from here
				<PopoverItem icon={<Icon name="git-branch" size={ICON_PX} />}>{context.branch}</PopoverItem>
			)}
			<PopoverItem icon={<Icon name="laptop" size={ICON_PX} />}>{THIS_MAC}</PopoverItem>
			<PopoverSeparator />
			<div className="sumi-chat-context-open">
				<PopoverItem className="sumi-chat-context-open-item" onClick={() => onOpenIn(context.editor)}>
					{OPEN_IN.replace("{editor}", context.editor)}
				</PopoverItem>
				<EditorsSubmenu context={context} onOpenIn={onOpenIn} />
			</div>
		</>
	);
}

function EditorsSubmenu({ context, onOpenIn }: Pick<ContextMenuProps, "context" | "onOpenIn">): ReactElement {
	return (
		<Popover isPortaled>
			<PopoverTrigger asChild>
				<Button shape="square" emphasis="ghost" size="xs" label={CHOOSE_APP} className="sumi-chat-context-apps">
					<Icon name="chevron-right" size={ICON_PX} />
				</Button>
			</PopoverTrigger>
			<PopoverContent side="right" align="start" className="is-compact">
				{context.editors.map((editor) => (
					<PopoverItem key={editor} checked={editor === context.editor} onClick={() => onOpenIn(editor)}>
						{editor}
					</PopoverItem>
				))}
			</PopoverContent>
		</Popover>
	);
}
