import MaudownIt from "..";
import balance_pairs from "../rule/inline/balance_pairs";
import bold, { bold_post_processing } from "../rule/inline/bold";
import emphasis, { emphasis_post_processing } from "../rule/inline/emphasis";
import escape from "../rule/inline/escape";
import fragments_join from "../rule/inline/fragments_join";
import math, { math_post_processing } from "../rule/inline/latex";
import newline from "../rule/inline/newline";
import props from "../rule/inline/fragment_macro";
import text from "../rule/inline/text";
import { RulerList } from "../Ruler/RulerList";
import InlineState from "../state/InlineState";
import Token from "../Token";

export type InlineRuleProcessor = (state: InlineState, silent?: boolean) => boolean
export type InlineRulePPProcessor = (state: InlineState) => void

const rules: [string, InlineRuleProcessor, string[]?][] = [
  ['text', text],
  ['newline', newline],
  ['escape', escape],
  /*[ 'backticks',       require('./rules_inline/backticks') ],
  [ 'strikethrough',   require('./rules_inline/strikethrough').tokenize ],*/
  ['bold', bold],
  ['emphasis', emphasis],
  ['math', math],
  /*[ 'link',            require('./rules_inline/link') ],
  [ 'image',           require('./rules_inline/image') ],
  [ 'autolink',        require('./rules_inline/autolink') ],
  [ 'html_inline',     require('./rules_inline/html_inline') ],
  [ 'entity',          require('./rules_inline/entity') ]*/
];

const post_processing_rules: [string, InlineRulePPProcessor, string[]?][] = [
  ['balance_pairs', balance_pairs],
  /*[ 'strikethrough',   require('./rules_inline/strikethrough').postProcess ],*/
  ['bold_post_processing', bold_post_processing],
  ['emphasis_post_processing', emphasis_post_processing],
  ["math_post_processing", math_post_processing],
  // 成对规则将“**”分隔为其自己的文本标记，这些标记可能未使用，下面的规则将未使用的段与其余文本合并回来
  ['fragments_join', fragments_join],
  ["props", props],
];

export default class ParserInline {
  ruler = new RulerList<InlineRuleProcessor>()
  post_processing_ruler = new RulerList<InlineRulePPProcessor>()

  constructor() {
    rules.forEach((_, i) => {
      this.ruler.push(rules[i][0], rules[i][1]);
    })

    post_processing_rules.forEach((_, i) => {
      this.post_processing_ruler.push(post_processing_rules[i][0], post_processing_rules[i][1]);
    })
  }

  skip_token(state: InlineState) {
    let ok, pos = state.pos,
      rules = this.ruler.get_rules_fn(),
      max_nesting = state.md.options.max_nesting,
      cache = state.cache;

    if (typeof cache[pos] !== 'undefined') {
      state.pos = cache[pos];
      return;
    }

    if (state.level < max_nesting) {
      for (let i = 0; i < rules.length; i++) {
        // 增加 state.level 并在以后减少它以限制递归。
        // 在这里这样做是无害的，因为没有创建 token。
        // 但理想情况下，我们需要一个单独的私有状态变量来实现这个目的。
        //
        state.level++;
        let ok = rules[i](state, true);
        state.level--;

        if (ok) { break; }
      }
    } else {
      // 嵌套太多，直接跳到段落结尾。
      //
      // NOTE: 这将导致链接在以下情况下表现不正确， 
      // 当 `[` 的数量正好等于 `maxNesting + 1` 时：
      //
      //       [[[[[[[[[[[[[[[[[[[[[foo]()
      //
      // TODO: 当CM standard允许嵌套链接时，请删除此解决方法
      //       (我们可以通过阻止在验证模式下解析链接来替换它)
      //
      state.pos = state.src_len;
    }

    if (!ok) { state.pos++; }
    cache[pos] = state.pos;
  }

  /** 调用规则处理 `state` ，直到处理完 `state.src` */
  tokenize(state: InlineState) {
    let end = state.src_len
    let max_nesting = state.md.options.max_nesting;

    while (state.pos < end) {
      /** 是否通过任一规则 */
      let ok: boolean | undefined
      /** 所有规则 */
      let rules = this.ruler.get_rules_fn()

      // 尝试所有可能的规则。
      // 当成功时，规则应该：
      //
      // - 更新 `state.pos`
      // - 更新 `state.tokens`
      // - 返回 true

      if (state.level < max_nesting) {
        for (let i = 0; i < rules.length; i++) {
          ok = rules[i](state, false);
          if (ok) { break; }
        }
      }

      if (ok) {
        if (state.pos >= end) { break; }
        continue;
      }

      // 如果失败则将当前字符加入 `state.pending`
      state.pending += state.src[state.pos];
      state.pos += 1
    }

    if (state.pending) {
      state.push_pending();
    }
  }

  /** 按照 `src` 进行解析，将 `token` 结果输出到 `out_tokens` */
  parse(src: string, md: MaudownIt, env: any, out_tokens: Token[]) {
    let state = new InlineState(src, md, env, out_tokens);
    this.tokenize(state);

    // console.log("inline", JSON.parse(JSON.stringify(state.tokens)))
    // console.log("inline delimiters", JSON.parse(JSON.stringify(state.delimiters)))

    let rules = this.post_processing_ruler.get_rules_fn();

    for (let i = 0; i < rules.length; i++) {
      rules[i](state);
    }

    // console.log("inline post processing", state.tokens.slice())
    // console.log("inline post processed delimiters", JSON.parse(JSON.stringify(state.delimiters)))
  }
}