import type { ComponentType } from "react";
import type { z } from "zod";

export interface McpAppViewProps<Result> {
	readonly result: Result;
}

export interface McpAppEntry<Schema extends z.ZodType> {
	readonly name: string;
	readonly schema: Schema;
	readonly view: ComponentType<McpAppViewProps<z.output<Schema>>>;
	readonly height: number;
	readonly guide: string;
}
