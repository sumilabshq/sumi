import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@widgetarium/kit";

export interface ConfirmDeleteProps {
	readonly isOpen: boolean;
	readonly title: string;
	readonly description: string;
	readonly confirmLabel: string;
	readonly onConfirm: () => void;
	readonly onClose: () => void;
}

const CANCEL_LABEL = "Cancel";

export function ConfirmDelete({
	isOpen,
	title,
	description,
	confirmLabel,
	onConfirm,
	onClose,
}: ConfirmDeleteProps): ReactElement {
	return (
		<AlertDialog open={isOpen} onOpenChange={(next) => !next && onClose()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{CANCEL_LABEL}</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirm}>
						{confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
