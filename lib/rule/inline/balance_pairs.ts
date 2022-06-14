// 对于每个 delimiters 记录为开头的标记，找到一个匹配的结尾标记

import { InlineRulePPProcessor } from "../../parser/ParserInline";
import InlineState, { Delimiter } from "../../state/InlineState";

function process_delimiters(state: InlineState, delimiters: InlineState["delimiters"]) {
  /** `delimiters` 数组大小 */
  const delimiters_len = delimiters.length;
  /** 可以作为开始定界符的定界符索引列表 */
  const co_indexs: number[] = []
  /** 可以作为结束定界符的定界符索引列表 */
  const cc_indexs: number[] = []

  delimiters.forEach((d, i) => {
    if (d.open) {
      co_indexs.push(i)
    }
    if (d.close) {
      cc_indexs.push(i)
    }
  })

  const limiters_stack: number[] = []
  let limiters_last: undefined | number = undefined

  const skip_list = Array(delimiters_len).fill(false)

  if (!delimiters_len) return;

  /** 上一次找到小于 closer_index 的 coi 在 co_indexs 中的索引 */
  let last_start_coi_index = co_indexs.length - 1

  for (let cci = cc_indexs.length - 1;
    cci >= 0;
    cci--
  ) {
    const closer_index = cc_indexs[cci];
    if (skip_list[closer_index]) { continue }

    while (limiters_last && closer_index < limiters_last) {
      limiters_stack.pop()
      limiters_last = limiters_stack[limiters_stack.length - 1]
    }
    
    const closer = delimiters[closer_index];

    /** 比 closer_index 小的第一个 coi */
    let coi_start_index: number

    // 找到比 closer_index 小的第一个 coi
    for (coi_start_index = last_start_coi_index;
      coi_start_index >= 0;
      coi_start_index--
    ) {
      if (co_indexs[coi_start_index] < closer_index) {
        last_start_coi_index = coi_start_index
        break
      }
    }

    for (let coi = coi_start_index;
      co_indexs[coi] > (limiters_last ?? -1);
      coi--
    ) {
      const opener_index = co_indexs[coi];

      if (skip_list[opener_index]) { continue }

      const opener = delimiters[opener_index];

      if (opener.token_index === closer.token_index - 1) { continue }

      const prev_index = co_indexs[coi - 1]
      let prev

      if (prev_index !== undefined
        && (limiters_last === undefined || prev_index > limiters_last)
      ) {
        prev = delimiters[prev_index]
      }


      if (opener.marker !== closer.marker
        || (prev && prev.marker === opener.marker
          && prev.token_index === opener.token_index - 1
        )
      ) {
        continue
      }

      opener.end = closer_index

      limiters_stack.push(opener_index)
      limiters_last = opener_index

      skip_list[opener_index] = true
      skip_list[closer_index] = true
      break
    }
  }
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
