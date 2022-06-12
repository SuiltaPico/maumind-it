import { BlockRuleProcessor } from "../../parser/ParserBlock";
import { Nesting } from "../../Token";

const comments: BlockRuleProcessor = (state, start_line, end_line, silent) => {
  const first_line = state.cs_arr[start_line];
  const first_code = first_line.charCodeAt(0);
  
  if (first_code !== 0x2D/* - */ && first_code !== 0x2f/* / */) {
    return false;
  }

  const comments_start_RE = /^([-]*)\/\*(\+)?/, comments_end_RE = /\*\/([-]*)$/;

  const start_match_res = first_line.match(comments_start_RE);

  if (start_match_res) {
    const bdi_length = start_match_res[1]?.length ?? 0;
    /** 是否为渲染注释 `/*+` */
    const is_need_render = Boolean(start_match_res[2])

    for (let i = start_line; i < end_line; i++) {
      const line_content = state.cs_arr[i];
      const end_match_res = line_content.match(comments_end_RE);

      if (end_match_res) {
        const end_bdi_length = end_match_res[1]?.length ?? 0;
        if (bdi_length === end_bdi_length) {
          if (!silent) {
            const token = state.push('comments', '', Nesting.SelfClosing);
            token.content = state.get_lines(start_line, i + 1)
              .slice(2 + (is_need_render ? 1 : 0) + bdi_length, -2 - bdi_length);
            token.map = [start_line, i];
            token.hidden = !is_need_render;

            state.line_index = i + 1
          }
          return true;
        }
      }
    }
  }
  return false;
}

export default comments