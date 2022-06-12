import Rule, { RuleFn, RuleOptions } from "./Rule";

export type EnableAndDisable = (list: string | string[], ignore_invalid: boolean) => string[]

export default interface Ruler<T extends RuleFn> {
  replace(target_name: string, fn: T, options?: RuleOptions): void
  enable: EnableAndDisable
  enable_only: EnableAndDisable
  disable: EnableAndDisable
  get_rules_fn(tag?: string): any
  get_rules(): Rule<T>[]
}