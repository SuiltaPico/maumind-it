// 处理软换行 `"\n"` 和硬换行 `"\\\n"`

import codes from "../../common/codes";
import { InlineRuleProcessor } from "../../parser/ParserInline";
import { Nesting } from "../../Token";

let newline: InlineRuleProcessor = (state, silent) => {
  let pos = state.pos;

  if (!silent) {
    if (
      state.src.charCodeAt(pos) === codes.Backslash
      && state.src.charCodeAt(pos + 1) === codes.LF
    ) {
      state.push('hardbreak', 'br', Nesting.SelfClosing);
    } else if (state.src.charCodeAt(pos) === codes.LF) {
    // 软换行删除前行行末空格
      // state.pending = state.pending
      state.push('softbreak', 'br', Nesting.SelfClosing);
    } else {
      return false
    }
  }

  pos += 1;

  // 跳过下一行的缩进
  state.skip_space()

  state.pos = pos;
  return true;
};

export default newline