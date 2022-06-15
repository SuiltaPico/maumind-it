import { InlineRulePPProcessor, InlineRuleProcessor } from "../../parser/ParserInline";
import InlineState, { Delimiter } from "../../state/InlineState";
import { Nesting } from "../../Token";

const match_target_map = {
  0x5b: 0x5d,
  0x7b: 0x7d,
  0x5d: 0x5b,
  0x7d: 0x7b,
}

const fragment_macro: InlineRuleProcessor = (state, silent) => {
  if (silent) { return false; }
  const first_code = state.src.charCodeAt(state.pos);

  if (first_code !== 0x5b /* [ */ && first_code !== 0x5d /* ] */
    && first_code !== 0x7b /* { */ && first_code !== 0x7d /* } */
  ) {
    return false
  }

  const token = state.push('text', '', Nesting.SelfClosing);
  token.content = String.fromCharCode(first_code);

  const delimiters = state.delimiters;
  delimiters.push({
    marker: first_code,
    length: 1,
    token_index: state.tokens.length - 1,
    end: -1,
    open: first_code === 0x5b || first_code === 0x7b,
    close: first_code === 0x5d || first_code === 0x7d,
    near_word: false,
    match_target: match_target_map[first_code]
  });

  state.pos += 1;

  return true;
}

export default fragment_macro;

function process_delimiters(state: InlineState, delimiters: Delimiter[]) {
  const processor = (start_delimiter: Delimiter, end_delimiter: Delimiter, start_index: number) => {
    const header_end_index = start_delimiter.end
    if (!delimiters[header_end_index + 1]) { return 0 }

    const body_start_delimiter = delimiters[header_end_index + 1]

    if (body_start_delimiter.marker !== 0x7b
      || body_start_delimiter.token_index !== end_delimiter.token_index + 1
      || body_start_delimiter.end === -1
    ) {
      return 0
    }

    const tokens = state.tokens;

    const header_tokens = tokens.slice(
      start_delimiter.token_index + 1,
      end_delimiter.token_index
    );


    const body_tokens = tokens.slice(
      body_start_delimiter.token_index + 1,
      delimiters[body_start_delimiter.end].token_index
    )

    body_tokens.forEach(t => {
      t.content = ""
    })
    

    return 3
  }

  state.process_pair_delimiter(delimiters, processor, (delimiters) => {
    return delimiters.marker === 0x5b /* [ */
  })
}

export const fragment_macro_post_processing: InlineRulePPProcessor = (state) => {
  const tokens_meta = state.tokens_meta,
    max = state.tokens_meta.length;

  process_delimiters(state, state.delimiters);

  for (let curr = 0; curr < max; curr++) {
    if (tokens_meta[curr] && tokens_meta[curr].delimiters) {
      process_delimiters(state, tokens_meta[curr].delimiters);
    }
  }
};