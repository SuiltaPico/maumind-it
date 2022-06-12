import Rule, { RuleFn, RuleOptions } from "./Rule"
import Ruler, { EnableAndDisable } from "./Ruler"

/** 规则的管理器。
 * 
 * 用于：
 * - 以定义的顺序保持规则。
 * - 为每个规则分配名称。
 * - 启用/禁用规则。
 * - 添加/替换规则。
 * - 允许将规则分配给其他命名链。
 * - 缓存活动规则列表。
*/
export class RulerList<T extends RuleFn> implements Ruler<T> {
  /** 添加的规则列表。*/
  rules: Rule<T>[] = []

  /** 缓存规则链。*/
  cache?: { [key: string]: T[] }

  /** 寻找某个规则的索引
   * @param name 规则名
   * @returns 规则索引，查找失败则为 -1
   */
  find(name: string) {
    return this.rules.findIndex(function (value) {
      return value.name == name
    })
  }

  /** 构建规则查找缓存。 */
  #compile() {
    let self = this;
    /** alt 链 */
    let chains = [""]

    // 清空缓存
    this.cache = {};

    // 从规则的中收集所有启用了的规则的，存在的 alt 名
    this.rules.forEach(function (rule) {
      if (!rule.enabled) return;

      rule.tag.forEach(function (tag) {
        // Doubt: 潜在危险 chains 过多导致性能低下，可以用 Set 优化
        if (chains.indexOf(tag) < 0) {
          chains.push(tag);
        }
      });
    });

    // 为 '' chain 缓存所有 rule.fn
    // 为 cache 建立 （alt）chain 到 rule.fn 的映射
    chains.forEach((chain) => {
      // 为每个 chain 初始化一个缓存数组
      this.cache![chain] = [];
      this.rules.forEach(function (rule) {
        if (
          !rule.enabled
          || chain && rule.tag.indexOf(chain) < 0 // 如果 chain 不是非空字符串且 rule 内没有 chain，也跳过
        ) return;

        // 为其对应的缓存数组推入一个规则函数
        self.cache![chain].push(rule.fn);
      });
    });
  };

  /** 用新函数和选项替换规则名称。如果找不到名称，则抛出错误。 */
  replace(target_name: string, fn: T, options?: RuleOptions) {
    let index = this.find(target_name);
    let opt = options || {};

    if (index === -1) { RulerList.#rule_not_found(target_name) }

    this.rules[index].fn = fn;
    this.rules[index].tag = opt.tag || [];
    this.cache = undefined;
  };

  /** 在具有给定名称的规则之前添加新规则。 */
  before_insert(target_name: string, new_rule_name: string, fn: T, options?: RuleOptions) {
    let index = this.find(target_name);
    let opt = options || {};

    if (index === -1) { RulerList.#rule_not_found(target_name) }

    this.rules.splice(index, 0, {
      name: new_rule_name,
      enabled: true,
      fn: fn,
      tag: opt.tag || []
    });

    this.cache = undefined;
  };

  /** 在具有给定名称的规则之后添加新规则。 */
  after_insert(target_name: string, new_rule_name: string, fn: T, options?: RuleOptions) {
    let index = this.find(target_name);
    let opt = options || {};

    if (index === -1) { RulerList.#rule_not_found(target_name) }

    this.rules.splice(index + 1, 0, {
      name: new_rule_name,
      enabled: true,
      fn: fn,
      tag: opt.tag || []
    });

    this.cache = undefined;
  }

  /** 在所有规则之后添加新规则。 */
  push(ruleName: string, fn: T, options?: RuleOptions) {
    let opt = options || {};

    this.rules.push({
      name: ruleName,
      enabled: true,
      fn: fn,
      tag: opt.tag || []
    });

    this.cache = undefined;
  };

  /** 启用具有给定名称的规则。如果未找到任何规则名称，则抛出错误。
   * 第二个参数可以禁用错误。
   * 
   * @param list 要启用的规则名称列表。
   * @param ignore_invalid 设置 `true` 以在找不到规则时忽略错误。
   */
  enable: EnableAndDisable = (list, ignore_invalid) => {
    if (!Array.isArray(list)) { list = [list]; }

    let result: string[] = [];
    let self = this

    list.forEach(function (name) {
      var index = self.find(name);
      if (index < 0) {
        if (ignore_invalid) return;
        throw new Error('Ruler: invalid rule name ' + name);
      }
      self.rules[index].enabled = true;
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
   */
  disable: EnableAndDisable = (list, ignore_invalid) => {
    if (!Array.isArray(list)) { list = [list]; }

    var result: string[] = [];
    let self = this

    list.forEach(function (name) {
      var index = self.find(name);
      if (index < 0) {
        if (ignore_invalid) return;
        throw new Error('Rules manager: invalid rule name ' + name);
      }
      self.rules[index].enabled = false;
      result.push(name);
    });

    this.cache = undefined;
    return result;
  };

  /** 返回给定链名的活动函数（规则）数组。它分析规则配置，编译缓存（如果不存在）并返回结果。
   * 
   * 默认链名为空字符串，不能跳过。这是故意的，为了保持高速的单态性。
   */

  get_rules_fn(chainName = "") {
    if (this.cache === undefined) {
      this.#compile();
    }

    // 如果禁用规则，链可以为空。但我们仍然需要返回数组。
    return this.cache![chainName] || [];
  };

  get_rules(){
    return this.rules.slice()
  }

  static #rule_not_found(name: string) {
    throw new Error(`Parser rule not found: ${name}`);
  }
}

