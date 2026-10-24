import type { AnyRequest, InputArgs, OutputOf } from "./request";

export type Send<S extends AnyRequest> = <R extends S>(request: R, ...asked: InputArgs<R>) => Promise<OutputOf<R>>;

export type Sender<S extends AnyRequest> = Readonly<Record<"send", Send<S>>>;
