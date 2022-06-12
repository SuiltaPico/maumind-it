import MaudownIt from "..";
import heading from "../rule/block/heading";
import comments from "../rule/block/comments";
import paragraph from "../rule/block/paragraph";
import { RulerList } from "../Ruler/RulerList";
import BlockState from "../state/BlockState";
import Token from "../Token";
import section_close_fixer from "../rule/block/section_close_fixer";
import extension_block from "../rule/block/extension_block";
import { replace } from "lodash";
import list from "../rule/block/list";
import hr from "../rule/block/hr";

/** 
 * @param state 块状态。
 * @param line 起始行。
 * @param end_line 结束行。
 * @param silent 是否为静默模式。静默模式仅验证某行是否可以通过规则
 * @returns 是否与规则匹配成功 */
export type BlockRuleProcessor = (state: BlockState, line: number, end_line: number, silent: boolean) => boolean

export type BlockPPRuleProcessor = (state: BlockState) => void

const rules: [string, BlockRuleProcessor, string[]?][] = [
  ["comments", comments, ['paragraph', 'reference']],
  ["extension_block", extension_block, ['paragraph', 'reference', 'blockquote']],
  /*[ 'table',      require('./rules_block/table'),      [ 'paragraph', 'reference' ] ],*/
  //[ 'code',       require('./rules_block/code') ],
  // [ 'fence',      require('./rules_block/fence'),      [ 'paragraph', 'reference', 'blockquote', 'list' ] ],
  // [ 'blockquote', require('./rules_block/blockquote'), [ 'paragraph', 'reference', 'blockquote', 'list' ] ],
  ['hr', hr, ['paragraph', 'reference', 'blockquote', 'list']],
  ['list', list, ['paragraph', 'reference', 'blockquote']],
  // [ 'reference',  require('./rules_block/reference') ],
  ['heading', heading, ['paragraph', 'reference', 'blockquote']],
  ['paragraph', paragraph]
];

const post_processing_rules: [string, BlockPPRuleProcessor][] = [
  ['section_close_fixer', section_close_fixer]
]

/** 块解析器。 */
export default class ParserBlock {
  /** Ruler 实例，用于保留块规则的配置。 */
  ruler: RulerList<BlockRuleProcessor>
  post_processing_ruler: RulerList<BlockPPRuleProcessor>
  constructor() {
    this.ruler = new RulerList();
    for (let i = 0; i < rules.length; i++) {
      this.ruler.push(
        rules[i][0], rules[i][1],
        { tag: (rules[i][2] || []).slice() }
      );
    }

    this.post_processing_ruler = new RulerList();
    for (let i = 0; i < post_processing_rules.length; i++) {
      this.post_processing_ruler.push(
        post_processing_rules[i][0], post_processing_rules[i][1]
      );
    }
  }

  /** 为输入范围生成 tokens。 
   * @param end_line 结束行，是不存在的行。也可以当做行数。
  */
  tokenize(state: BlockState, start_line: number, end_line: number) {
    let max_nesting = state.md.options.max_nesting;
    let rules = this.ruler.get_rules_fn()
    let line = start_line
    let hasEmptyLines = false

    while (line < end_line) {
      state.line_index = line = state.skip_empty_line(line);
      if (line >= end_line || line < 0) break;

      // 嵌套调用的终止条件。当前用于 blockquotes 和列表的嵌套调用
      if (state.indent_count[line] < state.block_indent) { break; }

      // 如果超过嵌套级别 - 将尾部跳到末尾。这不是一般情况，我们不应该关心内容。
      if (state.level >= max_nesting) {
        state.line_index = end_line;
        break;
      }

      // 尝试所有可能的规则。
      // 当成功时，规则应该：
      //
      // - 更新 `state.line`
      // - 更新 `state.tokens`
      // - 返回 true

      for (let i = 0; i < rules.length; i++) {
        let ok = rules[i](state, line, end_line, false);

        if (ok) { break; }
      }

      line = state.line_index;

      const not_null_line = state.skip_empty_line(line);
      if (not_null_line !== -1) {
        state.line_index = line = not_null_line;
      }
    }
  };

  /** 对特定范围的源码进行解析
   * @param state 状态
   * @param start 精确的起始行索引、起始位置
   * @param end 精确的结束行索引、结束位置 + 1
   * @param indents 自定义范围的缩进量，长度必须为 `end - start + 1`
   */
  range_tokenize(
    state: BlockState,
    start: [line: number, start?: number],
    end: [line: number, end?: number],
    indents?: number[]
  ) {
    const ori_cs_arr = state.cs_arr;
    const new_cs_arr = ori_cs_arr.slice()

    new_cs_arr[start[0]] = new_cs_arr[start[0]].slice(start[1])
    new_cs_arr[end[0]] = new_cs_arr[end[0]].slice(0, end[1])

    const ori_indent_count = state.indent_count;
    const new_indent_count = ori_indent_count.slice()

    if (indents) {
      for (
        let line = start[0], i = 0;
        line < indents.length;
        line++, i++
      ) {
        new_indent_count[line] = indents[i];
      }
    }

    const proxy = new Proxy(state, {
      get: (target, p, receiver) => {
        if (p === "cs_arr") {
          return new_cs_arr
        } else if (p === "indent_count") {
          return new_indent_count
        } else {
          return Reflect.get(target, p, receiver)
        }
      },
    })
    this.tokenize(proxy, start[0], end[0] + 1)
  }

  /** 处理输入的字符串，将块 tokens 推入 `out_tokens` 中
   */
  parse(src: string, md: MaudownIt, env: any, out_tokens: Token[]) {
    if (!src) return;

    let state = new BlockState(src, md, env, out_tokens);
    //console.log(state);

    this.tokenize(state, state.line_index, state.line_count);

    const post_processing_rules = this.post_processing_ruler.get_rules_fn()
    for (let i = 0; i < post_processing_rules.length; i++) {
      post_processing_rules[i](state);
    }
  };
}