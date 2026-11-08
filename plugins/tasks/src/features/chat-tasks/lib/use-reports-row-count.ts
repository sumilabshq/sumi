import { useEffect } from "react";

export function useReportsRowCount(count: number, onRowsCounted: (count: number) => void): void {
	useEffect(() => onRowsCounted(count), [count, onRowsCounted]);
}
