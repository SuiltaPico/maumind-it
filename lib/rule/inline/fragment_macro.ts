import { InlineRulePPProcessor, InlineRuleProcessor } from "../../parser/ParserInline";
import InlineState, { Delimiter } from "../../state/InlineState";
import Token, { Nesting } from "../../Token";
import make_id from "./macros/make_id";
import make_id_and_link from "./macros/make_id_and_link";

export type FragmentMacroProcessor = (state: InlineState, tokens: Token[], param: string) => void

export const macros: { [name: string]: FragmentMacroProcessor } = {}
macros["#"] = make_id
macros["##"] = make_id_and_link

const match_target_map = {
  0x5b: 0x5d,
  0x7b: 0x7d,
  0x28: 0x29,
  0x5d: 0x5b,
  0x7d: 0x7b,
  0x29: 0x28,
} as const

const fragment_macro: InlineRuleProcessor = (state, silent) => {
  if (silent) { return false; }
  const first_code = state.src.charCodeAt(state.pos);

  if (first_code !== 0x5b /* [ */ && first_code !== 0x5d /* ] */
    && first_code !== 0x7b /* { */ && first_code !== 0x7d /* } */
    && first_code !== 0x28 /* ( */ && first_code !== 0x29 /* ) */
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
    open: first_code === 0x5b || first_code === 0x7b || first_code === 0x28,
    close: first_code === 0x5d || first_code === 0x7d || first_code === 0x29,
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

    const body_end_delimiter = delimiters[body_start_delimiter.end]

    const tokens = state.tokens;

    const bsde_token = tokens[body_start_delimiter.token_index]
    const bede_token = tokens[body_end_delimiter.token_index]

    bsde_token.tag = "span"
    bsde_token.type = "span_open"
    bsde_token.nesting = Nesting.Opening
    bsde_token.content = ""

    bede_token.tag = "span"
    bede_token.type = "span_close"
    bede_token.nesting = Nesting.Closing
    bede_token.content = ""

    tokens[start_delimiter.token_index].content = ""
    tokens[end_delimiter.token_index].content = ""

    const header_tokens = tokens.slice(
      start_delimiter.token_index + 1,
      end_delimiter.token_index
    );

    const header_delimiters = delimiters.slice(
      start_index + 1,
      start_delimiter.end
    )

    let pt_indexes_map: { [start_index: number]: number } = {}
    for (let i = 0; i < header_delimiters.length; i++) {
      const de = header_delimiters[i];
      if (de.marker !== 0x28 || de.end === -1) { continue }
      pt_indexes_map[de.token_index] = i + start_index + 1
    }

    let macro_calls: [name: string, para: string][] = [];
    for (let i = 0; i < header_tokens.length; i++) {
      /** 小括号开始的索引 */
      let pde: number
      if ((pde = pt_indexes_map[
        i + start_delimiter.token_index + 1
      ]) !== undefined && macro_calls.length > 0) {
        // 收集 macro 参数
        const start_token_i = delimiters[pde].token_index
        const end_token_i = delimiters[delimiters[pde].end].token_index
        tokens[start_token_i].content = ""
        tokens[end_token_i].content = ""
        const para_tokens = tokens.slice(start_token_i + 1, end_token_i)
        let content = ""
        for (let x = 0; x < para_tokens.length; x++) {
          content += para_tokens[x].content
          para_tokens[x].content = ""
        }
        macro_calls[macro_calls.length - 1][1] = content
        continue
      }

      const token = header_tokens[i];
      const names = token.content.split(",")
      for (let x = 0; x < names.length; x++) {
        const name = names[x].trim();
        if (name === "") { continue }
        macro_calls.push([name, ""])
      }
      token.content = ""
    }

    const body_tokens = tokens.slice(
      body_start_delimiter.token_index,
      body_end_delimiter.token_index + 1
    )

    for (let mi = 0; mi < macro_calls.length; mi++) {
      const [name, para] = macro_calls[mi]
      const macro_processor = macros[name]
      if (!macro_processor) { continue }
      macro_processor(state, body_tokens, para)
    }

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