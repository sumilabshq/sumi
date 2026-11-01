export type TabRead =
	| { readonly kind: "reading" }
	| { readonly kind: "failed"; readonly reason: string }
	| { readonly kind: "read"; readonly chatId: string | null };
