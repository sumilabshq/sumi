import { useIsFetching } from "@tanstack/react-query";

export function useIsRereading(): boolean {
	return useIsFetching() > 0;
}
