// Process escaped chars
import codes, { is_ascii_punct_char } from "../../common/codes";
import { InlineRuleProcessor } from "../../parser/ParserInline";
import { Nesting } from "../../Token";

let escape: InlineRuleProcessor = (state, silent) => {
  let pos = state.pos
  const max = state.src_len

  if (state.src.charCodeAt(pos) !== 0x5c) { return false; }

  pos++;

  if (pos >= state.src_len) return false;

  const ch1 = state.src.charCodeAt(pos);
  let ch2: number

  let escaped_str = state.src[pos]

  if (ch1 >= 0xD800 && ch1 <= 0xDBFF && pos + 1 < max) {
    ch2 = state.src.charCodeAt(pos + 1);

    if (ch2 >= 0xDC00 && ch2 <= 0xDFFF) {
      escaped_str += state.src[pos + 1];
      pos++;
    }
  }

  const original_str = '\\' + escaped_str;

  if (!silent) {
    const token = state.push('text_special', '', Nesting.SelfClosing);

    //console.log(is_ascii_punct_char(String.fromCharCode(0x5c)))

    if (ch1 < 256 && is_ascii_punct_char(String.fromCharCode(ch1))) {
      token.content = escaped_str;
    } else {
      token.content = original_str;
    }

    token.markup = original_str;
    token.info = 'escape';
  }

  state.pos = pos + 1;
  return true;
};

export default escape