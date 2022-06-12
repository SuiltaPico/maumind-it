import { InlineRulePPProcessor, InlineRuleProcessor } from "../../parser/ParserInline";
import InlineState, { Delimiter } from "../../state/InlineState";
import { Nesting } from "../../Token";

const math: InlineRuleProcessor = (state, silent) => {
  const first_code = state.src.charCodeAt(state.pos);
  if (silent) { return false; }

  if (first_code !== 0x24 /* $ */) {
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

export default math

function process_delimiters(state: InlineState, delimiters: InlineState["delimiters"]) {

  const processor = (start_delimiter: Delimiter, end_delimiter: Delimiter, i: number) => {
    const end_delimiter_index = start_delimiter.end
    const ch = String.fromCharCode(start_delimiter.marker);
    const is_double_sign =
      i > 0
      && delimiters[i - 1].end === start_delimiter.end + 1
      && delimiters[i - 1].marker === start_delimiter.marker;
    const tokens = state.tokens;

    const open_token = tokens[start_delimiter.token_index];
    const open_token_index = start_delimiter.token_index;
    const end_token = tokens[end_delimiter.token_index];
    const end_token_index = end_delimiter.token_index;

    open_token.content = "";
    open_token.type = "latex"
    open_token.tag = ""
    open_token.nesting = Nesting.SelfClosing
    open_token.markup = ch

    // 收集并清空 open_token 与 end_token 之间的所有 token 的内容
    for (let index = open_token_index + 1; index < end_token_index; index++) {
      const token = tokens[index];
      open_token.content += token.content;
      token.content = "";
      token.type = "text"
      token.tag = ""
      token.nesting = Nesting.SelfClosing
    }

    end_token.content = ""
    end_token.type = "text"
    end_token.tag = ""
    end_token.nesting = Nesting.SelfClosing


    if (is_double_sign) {
      open_token.markup += ch;
      state.tokens[delimiters[i - 1].token_index].content = '';
      state.tokens[delimiters[end_delimiter_index + 1].token_index].content = '';
      return 1 // 多跳一格
    }
    return 0
  }

  state.process_pair_delimiter(
    delimiters,
    processor,
    (delimiters) => {
      return delimiters.marker === 0x24/* $ */ && delimiters.end !== -1
    }
  );
}

export const math_post_processing: InlineRulePPProcessor = (state) => {
  const tokens_meta = state.tokens_meta,
    max = state.tokens_meta.length;

  process_delimiters(state, state.delimiters);

  for (let curr = 0; curr < max; curr++) {
    if (tokens_meta[curr] && tokens_meta[curr].delimiters) {
      process_delimiters(state, tokens_meta[curr].delimiters);
    }
  }
};