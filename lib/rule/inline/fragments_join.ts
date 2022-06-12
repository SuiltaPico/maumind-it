/**
 * 将相邻的文本节点合并为一个并重新计算所有标记级别。
 * 
 * 这是必要的，因为最初强调分隔符标记（*、_、~）被视为各自独立的文本标记。
 * 然后，规则要么将它们作为文本保留（需要与相邻文本合并），
 * 要么将它们转换为开始/结束标记（这会弄乱内部的级别）。
 */

import { InlineRulePPProcessor } from "../../parser/ParserInline";
import { Nesting } from "../../Token";

const fragments_join: InlineRulePPProcessor = (state) => {
  let curr = 0, last = 0
  let level = 0
  const tokens = state.tokens
  const max = state.tokens.length;

  for (; curr < max; curr++) {
    // 在强调/删除线规则将一些文本节点转换为开始/结束标记后，重新计算级别
    if (tokens[curr].nesting === Nesting.Closing) level--;
    tokens[curr].level = level;
    if (tokens[curr].nesting === Nesting.Opening) level++;
  
    if (
      tokens[curr].type === 'text' &&
      curr + 1 < max &&
      tokens[curr + 1].type === 'text'
    ) {

      // 折叠两个相邻的文本节点
      tokens[curr + 1].content = tokens[curr].content + tokens[curr + 1].content;
    } else {
      if (curr !== last) { tokens[last] = tokens[curr]; }
      last++;
    }
  }

  if (curr !== last) {
    tokens.length = last;
  }
}

export default fragments_join;