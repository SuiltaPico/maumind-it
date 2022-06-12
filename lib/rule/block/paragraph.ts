import { BlockRuleProcessor } from "../../parser/ParserBlock";
import { Nesting } from "../../Token";

const paragraph: BlockRuleProcessor = (state, start_line, end_line) => {
  state.push_props()
  state.set_props({
    parent_type: "paragraph"
  })

  /** 非段落的行 */
  let end: number

  /** 逐行跳转，直到遇到可以被 `'paragraph'` 规则拦截的行、空行或 EOF。
   * 一些标签可以在没有空行的情况下终止段落。如下例第二行：
   * ```ud
   * something...
   * #2 title
   * ```
  */

  /** 在段落判定中终止段落的规则 */
  const paragraph_rules = state.md.block.ruler.get_rules_fn('paragraph')
  
  main_loop: for (end = start_line + 1;
    end < end_line && !state.is_empty_line(end);
    end++
  ) {
    for (let i = 0, len = paragraph_rules.length; i < len; i++) {
      if (paragraph_rules[i](state, end, state.line_count, true)) {
        break main_loop;
      }
    }
  }

  const content = state.get_lines(start_line, end, {
    no_original_indent: true
  });

  state.line_index = end;

  const open_token = state.push('paragraph_open', 'p', Nesting.Opening);
  open_token.map = [start_line, state.line_index];

  const token = state.push('inline', '', Nesting.SelfClosing);
  token.content = content;
  token.map = [start_line, state.line_index];
  token.children = [];

  state.push('paragraph_close', 'p', Nesting.Closing);

  state.revert()

  return true;
};

export default paragraph