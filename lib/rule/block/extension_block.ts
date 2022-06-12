import { BlockRuleProcessor } from "../../parser/ParserBlock"
import { Nesting } from "../../Token";

const exblock_start = /^(?<exs_bdi>[\-]*)\/(?<ex_header>[^{]+|\{[^{]+)\{{2}/
const exblock_end = /\}{2}\/(?<exe_bdi>[\-]*)$/

const extension_block: BlockRuleProcessor = (state, start_line, end_line, silent) => {
  const first_line = state.cs_arr[start_line];
  const first_code = first_line.charCodeAt(0);

  if (first_code !== 0x2D /* - */ && first_code !== 0x2f /* / */) {
    return false;
  }
  
  const start_match_res = first_line.match(exblock_start);

  if (start_match_res) {
    const { exs_bdi, ex_header } = start_match_res.groups!
    const bdi_length = exs_bdi?.length ?? 0

    for (let i = start_line; i < end_line; i++) {
      const line_content = state.cs_arr[i];
      const end_match_res = line_content.match(exblock_end);

      if (end_match_res) {

        const { exe_bdi } = end_match_res.groups!
        const end_bdi_length = exe_bdi?.length ?? 0;

        if (bdi_length === end_bdi_length) {
          if (!silent) {
            const token = state.push('extension_block', 'extension_block', Nesting.SelfClosing);
            token.content = state.get_lines(start_line, i + 1)
              .slice(start_match_res[0].length, -end_match_res[0].length);
            token.map = [start_line, i];
            token.info = (ex_header ?? "").trim()

            state.line_index = i + 1
          }
          return true;
        }
      }
    }
  }
  return false
}

export default extension_block