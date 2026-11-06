declare const PERMISSION: unique symbol;

export type Permission = string & { readonly [PERMISSION]: "permission" };

export function permission(name: string): Permission;
export function permission(name: string): string {
	return name;
}
