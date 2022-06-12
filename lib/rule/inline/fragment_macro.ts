import { InlineRulePPProcessor, InlineRuleProcessor } from "../../parser/ParserInline";
import { Nesting } from "../../Token";

export const macro: InlineRuleProcessor = (state, silent) => {
  const fm_call_open_pos = state.pos
  const len = state.src_len

  const first_ch = state.src.charCodeAt(fm_call_open_pos);
  if (first_ch !== 0x5B /* [ */) { return false }

  let has_bdi = false
  let bdi_count = 0

  let ch = state.src.charCodeAt(fm_call_open_pos + 1);
  let pos: number
  let fm_call_close_pos

  // 匹配 `([^\]]|\][^{])+`，找到内联片段宏的开始与关闭符号
  for (pos = fm_call_open_pos + 1; ;) {
    pos += 1
    if (pos >= len) { return false }

    const next_ch = state.src.charCodeAt(pos);
    if (
      ch === 0x5D /* ] */
      && (
        next_ch === 0x7b /* { */
        || (next_ch === 0x23 /* # */ && (has_bdi = true))
      )
    ) {
      fm_call_close_pos = pos
      break
    }
    ch = next_ch
  }

  // 统计 bdi 的个数
  if (has_bdi) {
    bdi_count = 1
    // 跳过第一个 `#`，因为前面已经判断过了
    for (pos += 2; ;) {
      if (pos >= len) { return false }
      const ch = state.src.charCodeAt(pos);
      if (ch === 0x23 /* # */) {
        bdi_count += 1
      } else {
        break
      }
    }
  }

  if (state.src.charCodeAt(pos) !== 0x7b) { return false }
  const fm_content_open_pos = pos
  let fm_content_close_pos: number
  pos++

  // 找到内联片段宏的开始与关闭符号
  for (; ;) {
    if (pos >= len) { return false }
    const ch = state.src.charCodeAt(pos);
    if (ch === 0x7d /* } */) {
      fm_content_close_pos = pos
      if (has_bdi) {
        
      }
      break
    }
  }

  return false;
}



const props: InlineRulePPProcessor = (state) => {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // 从 text token 提取 props
    if (token.type === "text") {

    }
  }
}

export default props;