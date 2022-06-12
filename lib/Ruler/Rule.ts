export type RuleFn = (...param: any[]) => any

export interface RuleOptions {
  /** 标签名称数组。
   * * `paragraph` 规则适用于段落内部
   */
  tag?: string[];
}

/** 规则 */
export default interface Rule<T extends RuleFn> extends RuleOptions {
  /** 规则名 */
  name: string
  /** 是否已启用 */
  enabled: boolean
  fn: T
  tag: string[]
}