import { Button, Icon, Popover, PopoverContent, PopoverItem, PopoverTrigger } from "widgetarium/kit";
import { DELETE, EDIT } from "./labels";

type ActionButtonsProps = {
	noun: string;
	canEdit: boolean;
	canDelete: boolean;
	onAsk: (asked: "edit" | "delete") => void;
};

export function ActionButtons({ noun, canEdit, canDelete, onAsk }: ActionButtonsProps) {
	return (
		<>
			{canEdit ? (
				<Button shape="square" label={EDIT.replace("{noun}", noun)} onClick={() => onAsk("edit")}>
					<Icon name="pencil" />
				</Button>
			) : null}
			{canDelete ? (
				<Popover>
					<PopoverTrigger asChild>
						<Button shape="square" label="More" emphasis="ghost">
							<Icon name="ellipsis" />
						</Button>
					</PopoverTrigger>
					<PopoverContent>
						<PopoverItem onClick={() => onAsk("delete")}>{DELETE.replace("{noun}", noun)}</PopoverItem>
					</PopoverContent>
				</Popover>
			) : null}
		</>
	);
}
