import { useRef } from "react";

export function useSettled<T extends { readonly stamp: number }>(value: T | null): T | null {
	const held = useRef<T | null>(value);
	if (value && held.current?.stamp !== value.stamp) held.current = value;
	return value ? held.current : null;
}
