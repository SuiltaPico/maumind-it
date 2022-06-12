import { RulerList } from "../Ruler/RulerList";
import CoreState from "../state/CoreState";

import char_normalize from "../rule/core/char_normalize"
import block from "../rule/core/block"
import inline from "../rule/core/inline";
import text_join from "../rule/core/text_join";

export type CoreRuleProcessor = (state: CoreState) => void

const _Rules: [string, CoreRuleProcessor][] = [
  ['char_normalize', char_normalize],
  ['block', block],
  ['inline', inline],
  /*['linkify', require('./rules_core/linkify')],
  ['replacements', require('./rules_core/replacements')],
  ['smartquotes', require('./rules_core/smartquotes')]*/
  ['text_join', text_join]
];

/** 核心解析器，也就是 CoreState 的处理器。
 * 
 * 构建时会自动创建一个 `Ruler` 并添加 `rule/core` 下所有的 `CoreRuleProcessor` 。会自动带动 `ParserBlock` 和 `ParserInline` 一起工作。
 */
export default class ParserCore {
  ruler: RulerList<CoreRuleProcessor>
  constructor() {
    this.ruler = new RulerList();
    let self = this
    _Rules.forEach(function (rule) {
      self.ruler.push(rule[0], rule[1]);
    })
  }

  /** 让 `state` 经过 CoreRuleProcessor 的处理。 */
  process(state: CoreState) {
    /** 所有的 rule */
    let rules = this.ruler.get_rules_fn();
    for (let i = 0; i < rules.length; i++) {
      rules[i](state);
    }
  };
}