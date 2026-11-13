const ROW_PAD_PX = 16;
const NEST_STEP_PX = 24;

export function rowIndentOf(depth: number): number {
	return ROW_PAD_PX + depth * NEST_STEP_PX;
}
