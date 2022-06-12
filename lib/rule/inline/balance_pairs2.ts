// 对于每个 delimiters 记录为开头的标记，找到一个匹配的结尾标记

import { InlineRulePPProcessor } from "../../parser/ParserInline";
import InlineState from "../../state/InlineState";

function process_delimiters(state: InlineState, delimiters: InlineState["delimiters"]) {
  /** `delimiters` 数组大小 */
  const delimiters_len = delimiters.length;

  if (!delimiters_len) return;

  
}

const balance_pairs: InlineRulePPProcessor = (state) => {
  const tokens_meta = state.tokens_meta,
    max = state.tokens_meta.length;

  process_delimiters(state, state.delimiters);

  for (let curr = 0; curr < max; curr++) {
    if (tokens_meta[curr] && tokens_meta[curr].delimiters) {
      process_delimiters(state, tokens_meta[curr].delimiters);
    }
  }
};

export default balance_pairs;
