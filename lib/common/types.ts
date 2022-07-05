export type ValueOfArray<T extends readonly any[]> = T[number]
export type AfterFirstParameters<F, T extends (first: F, ...args: any) => any> = T extends (first: F, ...args: infer P) => any ? P : never
export type Optional<T> = { [P in keyof T]?: T[P] }
export type UnwrapPromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never
export type Serializable = string | number | boolean | null | undefined | Serializable[] | { [key: string]: Serializable }