import { createContext } from "react";
// TODO: the framework should not draw; move kit views to the app
import { toast } from "@widgetarium/kit";

export interface CommandRefusal {
	readonly name: string;
	readonly reason: string;
	readonly ran: boolean;
}

export type RefusalHandler = (refusal: CommandRefusal) => void;

export function toastRefusal({ reason }: CommandRefusal): void {
	toast.error(reason, { id: `refusal:${reason}` });
}

export const REFUSAL_HANDLER = createContext<RefusalHandler>(toastRefusal);

export const OnRefused = REFUSAL_HANDLER.Provider;
