import { BlockRuleProcessor } from "../../parser/ParserBlock";
import { Nesting } from "../../Token";

const hr: BlockRuleProcessor = (state, start_line, end_line, silent) => {
  let pos = 0

  const line_cs = state.cs_arr[start_line];

  while (pos < line_cs.length) {
    const ch = line_cs.charCodeAt(pos++);
    if (ch !== 0x5F /* _ */) { return false; }
  }

  if (pos < 3) { return false; }

  if (silent) { return true; }

  state.line_index = start_line + 1;

  const token = state.push('hr', 'hr', Nesting.SelfClosing);
  token.map = [start_line, state.line_index];
  token.markup = line_cs;

  return true;
};

export default hr;