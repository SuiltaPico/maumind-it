// Parse backticks

'use strict';

import { InlineRuleProcessor } from "../../parser/ParserInline";


const backtick: InlineRuleProcessor = (state, silent) => {
  let pos = state.pos
  const ch = state.src.charCodeAt(pos);
  let match_end

  if (ch !== 0x60/* ` */) { return false; }

  const start = pos;
  pos++;
  const max = state.src_len;

  // 扫描标记长度
  while (pos < max && state.src.charCodeAt(pos) === 0x60/* ` */) { pos++; }

  const marker = state.src.slice(start, pos);
  const opener_length = marker.length;

  if (state.backticks_scanned && (state.backticks[opener_length] || 0) <= start) {
    if (!silent) state.pending += marker;
    state.pos += opener_length;
    return true;
  }

  let match_start = match_end = pos;

  // 在缓存中没有找到任何东西，扫描到行尾（或直到找到标记）
  while ((match_start = state.src.indexOf('`', match_end)) !== -1) {
    match_end = match_start + 1;

    // 扫描标记长度
    while (match_end < max && state.src.charCodeAt(match_end) === 0x60/* ` */) { match_end++; }

    const closer_length = match_end - match_start;

    if (closer_length === opener_length) {
      // 找到匹配的更近的长度。
      if (!silent) {
        const token = state.push('code_inline', 'code', 0);
        token.markup = marker;
        token.content = state.src.slice(pos, match_start)
          .replace(/\n/g, ' ')
          .replace(/^ (.+) $/, '$1');
      }
      state.pos = match_end;
      return true;
    }

    // 找到一些不同的长度，把它放在缓存中作为可以找到更接近的位置的上限
    state.backticks[closer_length] = match_start;
  }

  // 扫了一遍，没找到
  state.backticks_scanned = true;

  if (!silent) state.pending += marker;
  state.pos += opener_length;
  return true;
};

export default backtick