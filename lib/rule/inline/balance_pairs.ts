// 对于每个 delimiters 记录为开头的标记，找到一个匹配的结尾标记

import { InlineRulePPProcessor } from "../../parser/ParserInline";
import InlineState from "../../state/InlineState";

function process_delimiters(state: InlineState, delimiters: InlineState["delimiters"]) {
  
  const openers_bottom: { [marker: number]: number[] } = {}

  /** `delimiters` 数组大小 */
  const delimiters_len = delimiters.length;

  if (!delimiters_len) return;

  /** 当前最接近分隔符运行的第一个分隔符 */
  let header_index = 0;
  /** 最后一个 token 的索引 */
  let last_token_index = -2
  const jumps: number[] = [];

  for (let closer_index = 0; closer_index < delimiters_len; closer_index++) {
    /** 尝试匹配用于关闭的分隔符 */
    const closer = delimiters[closer_index];

    jumps.push(0);

    /** 如果 `header_index` 与 `closer` 的字节码不同，
     * 或最后一个 token 与 `closer` 的上一个 token 不同，
     * 则让 `header_index` 跳到 `closer_index` */
    if (delimiters[header_index].marker !== closer.marker
      || last_token_index !== closer.token_index - 1
    ) {
      header_index = closer_index;
    }

    // 让上一个 token 为当前 `closer` 的 token
    last_token_index = closer.token_index;

    // 长度仅用于强调特定的“3 规则”，
    // 如果未定义（在删除线或第 3 方插件中），
    // 我们可以将其默认为 0 以禁用这些检查。
    //
    closer.length ||= 0;

    // closer 是可关闭的
    if (!closer.close) continue;

    if (!openers_bottom.hasOwnProperty(closer.marker)) {
      openers_bottom[closer.marker] = [-1, -1, -1, -1, -1, -1];
    }

    const min_opener_index = openers_bottom[closer.marker][(closer.open ? 3 : 0) + (closer.length % 3)];

    let opener_index = header_index - jumps[header_index] - 1;

    let new_min_opener_index = opener_index;

    // 逐个匹配 opener
    for (; opener_index > min_opener_index; opener_index -= jumps[opener_index] + 1) {
    
      const opener = delimiters[opener_index];

      if (opener.marker !== closer.marker) continue;

      if (opener.open && opener.end < 0) {

        let is_odd_match = false;

        if (opener.close || closer.open) {
          if ((opener.length + closer.length) % 3 === 0) {
            if (opener.length % 3 !== 0 || closer.length % 3 !== 0) {
              is_odd_match = true;
            }
          }
        }

        if (!is_odd_match) {
          // 如果前一个分隔符不能作为开始符，我们可以在以后的检查中安全地跳过整个序列。
          // 这是确保算法具有线性复杂性所必需的（参见 *_*_*_*_*_... 案例）。
          //
          const last_jump = opener_index > 0 && !delimiters[opener_index - 1].open ?
            jumps[opener_index - 1] + 1 : 0

          jumps[closer_index] = closer_index - opener_index + last_jump;
          jumps[opener_index] = last_jump;

          closer.open = false;
          opener.end = closer_index;
          opener.close = false;
          new_min_opener_index = -1;
          // 将下一个令牌视为运行的开始，
          // 它优化了跳过 **<...>**a**<...>** 错误案例
          last_token_index = -2;
          break;
        }
      }
    }

    if (new_min_opener_index !== -1) {
      // 如果此分隔符的匹配运行失败，
      // 我们希望为将来的查找设置下限。
      // 这是确保算法具有线性复杂性所必需的。
      //
      // See details here:
      // https://github.com/commonmark/cmark/issues/178#issuecomment-270417442
      //
      openers_bottom[closer.marker][(closer.open ? 3 : 0) + ((closer.length || 0) % 3)] = new_min_opener_index;
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
