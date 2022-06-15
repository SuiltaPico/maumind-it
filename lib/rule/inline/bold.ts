import { InlineRulePPProcessor, InlineRuleProcessor } from "../../parser/ParserInline";
import InlineState, { Delimiter } from "../../state/InlineState";
import { Nesting } from "../../Token";

const bold: InlineRuleProcessor = (state, silent) => {
  if (silent) { return false; }
  const first_code = state.src.charCodeAt(state.pos);

  if (first_code !== 0x2A /* * */) {
    return false
  }

  const delimiters = state.delimiters;
  const scanned = state.scan_delimiters(state.pos, true);

  for (let i = 0; i < scanned.length; i++) {
    const token = state.push('text', '', Nesting.SelfClosing);
    token.content = String.fromCharCode(first_code);

    delimiters.push({
      marker: first_code,
      length: 1,
      token_index: state.tokens.length - 1,
      end: -1,
      open: scanned.can_open,
      close: scanned.can_close,
      near_word: scanned.near_word
    });
  }

  state.pos += scanned.length;

  return true;
}

export default bold

function process_delimiters(state: InlineState, delimiters: InlineState["delimiters"]) {

  const processor = (start_delimiter: Delimiter, end_delimiter: Delimiter, i: number) => {
    const end_delimiter_index = start_delimiter.end
    const ch = String.fromCharCode(start_delimiter.marker);
    const is_double_sign =
      i > 0
      && delimiters[i - 1].end === start_delimiter.end + 1
      && delimiters[i - 1].marker === start_delimiter.marker;

    if (
      is_double_sign
      || !(start_delimiter.near_word && end_delimiter.near_word)
    ) {

      const open_token = state.tokens[start_delimiter.token_index];
      const end_token = state.tokens[end_delimiter.token_index];

      state.set_pair_delimiter_token(open_token, end_token, {
        tag: "strong",
        type: "strong",
        markup: ch,
        content: ""
      })

      if (is_double_sign) {
        open_token.markup += ch;
        end_token.markup += ch;
        state.tokens[delimiters[i - 1].token_index].content = '';
        state.tokens[delimiters[end_delimiter_index + 1].token_index].content = '';
        return 1 // 多跳一格
      }
    }
    return 0
  }

  state.process_pair_delimiter(
    delimiters,
    processor,
    (delimiters) => {
      return delimiters.marker === 0x2A/* * */
    }
  );
}

export const bold_post_processing: InlineRulePPProcessor = (state) => {
  const tokens_meta = state.tokens_meta,
    max = state.tokens_meta.length;

  process_delimiters(state, state.delimiters);

  for (let curr = 0; curr < max; curr++) {
    if (tokens_meta[curr] && tokens_meta[curr].delimiters) {
      process_delimiters(state, tokens_meta[curr].delimiters);
    }
  }
};