import Rule, { RuleFn, RuleOptions } from "./Rule";
import Ruler, { EnableAndDisable } from "./Ruler";

export default class RulerMap<T extends RuleFn> implements Ruler<T> {
  rules: Map<string, Rule<T>> = new Map()
  cache?: { [key: string]: { [key: string]: T } }

  constructor(rules?: { [key: string]: T | { tags: string[], processor: T } }) {
    for (let i in rules) {
      const rule = rules[i]
      if (typeof rule === "function") {
        this.push(i, rule)
      } else {
        this.push(i, rule.processor, rule.tags)
      }
    }
  }

  #compile() {
    this.cache = {}
    this.rules.forEach((r, n) => {
      if (!r.enabled) return;
      r.tag.forEach(tag_name => {
        let tag_obj = this.cache![tag_name]

        if (tag_obj === undefined) {
          tag_obj = {}
          this.cache![tag_name] = tag_obj
        }

        tag_obj[n] = r.fn
      });
    })
    this.cache![""] = {}
    this.rules.forEach((r, n) => {
      this.cache![""][n] = r.fn
    })
  }

  replace(target_name: string, fn: T, options?: RuleOptions): void {
    let target_rule = this.rules.get(target_name);
    let opt = options || {};

    if (target_rule === undefined) { RulerMap.#rule_not_found(target_name); return }

    target_rule.fn = fn;
    target_rule.tag = opt.tag || [];
    this.cache = undefined;
  }

  /** 启用具有给定名称的规则。如果未找到任何规则名称，则抛出错误。
   * 第二个参数可以禁用错误。
   * 
   * @param list 要启用的规则名称列表。
   * @param ignore_invalid 设置 `true` 以在找不到规则时忽略错误。
   * @returns 启用成功的规则
   */
  enable: EnableAndDisable = (list, ignore_invalid) => {
    if (!Array.isArray(list)) { list = [list]; }

    let result: string[] = [];

    list.forEach(name => {
      let rule = this.rules.get(name);
      if (rule === undefined) {
        if (ignore_invalid) return;
        throw new Error('Ruler: invalid rule name ' + name);
      }
      rule.enabled = true;
      result.push(name);
    });

    this.cache = undefined;
    return result;
  };

  /** 启用具有给定名称的规则，并禁用其他所有功能。如果未找到任何规则名称，则抛出错误。
   * 第二个参数可以禁用错误。
   * 
   * @param list 要启用的规则名称列表。
   * @param ignore_invalid 设置 `true` 以在找不到规则时忽略错误。
   * @returns 启用成功的规则
   */
  enable_only: EnableAndDisable = (list, ignore_invalid) => {
    this.rules.forEach(function (rule) { rule.enabled = false; });
    return this.enable(list, ignore_invalid);
  };

  /** 禁用具有给定名称的规则。如果未找到任何规则名称，则抛出错误。
   * 第二个参数可以禁用错误。 
   * 
   * @param list 要启用的规则名称列表。
   * @param ignore_invalid 设置 `true` 以在找不到规则时忽略错误。
   * @returns 禁用成功的规则
   */
  disable: EnableAndDisable = (list, ignore_invalid) => {
    if (!Array.isArray(list)) { list = [list]; }

    var result: string[] = [];

    list.forEach(name => {
      let rule = this.rules.get(name);
      if (rule === undefined) {
        if (ignore_invalid) return;
        throw new Error('Rules manager: invalid rule name ' + name);
      }
      rule.enabled = false;
      result.push(name);
    });

    this.cache = undefined;
    return result;
  }

  push(name: string, rule_fn: T, tags?: string[]) {
    const rule: Rule<T> = {
      name,
      enabled: true,
      fn: rule_fn,
      tag: tags ?? []
    }
    this.rules.set(name, rule)
  }

  get_rules_fn(tag_name = "") {
    if (this.cache === undefined) {
      this.#compile();
    }
    return this.cache![tag_name] ?? {};
  }

  get_rules() {
    let result: Rule<T>[] = []
    this.rules.forEach(r => {
      result.push(r)
    })
    return result
  }

  static #rule_not_found(name: string) {
    throw new Error(`Parser rule not found: ${name}`);
  }
}