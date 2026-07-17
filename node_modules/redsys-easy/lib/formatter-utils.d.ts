/**
 * Applies an input formatter to the first argument of a function
 *
 * @remarks
 * The signature of this function is so complex because tries to suport
 * formatters with generics that provide a default type. This should remain
 * until [variadic generics](https://github.com/microsoft/TypeScript/issues/5453)
 * land in typescript
 *
 * @public
 */
export declare const useSingleInputFormatter: <AF extends (input: any) => B, B, C extends readonly unknown[], D>(fn: (args_0: B, ...args_1: C) => D, inputFormatter: AF) => (input: Parameters<AF>[0], ...otherArgs_0: C) => D;
/**
 * Applies an output formatter to a function
 *
 * @public
 */
export declare const useOutputFormatter: <A, B, C>(fn: (a: A) => B, outputFormatter: (b: B) => C) => (a: A) => C;
/**
 * Applies an output formatter to the resolved ouput promise of a function
 *
 * @public
 */
export declare const usePromiseOutputFormatter: <A, B, C>(fn: (a: A) => Promise<B>, outputFormatter: (b: B) => C) => (a: A) => Promise<C>;
