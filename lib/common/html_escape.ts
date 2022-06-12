import { decodeHTML5 } from "entities";
import { ENTITY_RE } from "./html_entity";

const HTML_ESCAPE_TEST_RE = /[&<>"]/;
const HTML_ESCAPE_REPLACE_RE = /[&<>"]/g;
const HTML_REPLACEMENTS: { [key: string]: string } = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;'
};

/** 替换对 HTML 编码不安全的字符 */
function replace_unsafe_char(ch: string) {
  return HTML_REPLACEMENTS[ch];
}

/** 将字符转义为 HTML 编码 */
export function escape_HTML(str: string) {
  if (HTML_ESCAPE_TEST_RE.test(str)) {
    return str.replace(HTML_ESCAPE_REPLACE_RE, replace_unsafe_char);
  }
  return str;
}

/** 匹配转义，如 `\!` */
const UNESCAPE_MD_RE = /\\([!"#$%&'()*+,\-.\/:;<=>?@[\\\]^_`{|}~])/g;

/** 匹配组：
 * 1. 转义后字符（`\!`->`!`）
 * 2. HTML 实体名 */
const UNESCAPE_ALL_RE = new RegExp(UNESCAPE_MD_RE.source + '|' + ENTITY_RE.source, 'gi');

/** 转义转义字符和 HTML 实体为其代表的文本。 */
export function unescape_all(str: string) {
  if (str.indexOf('\\') < 0 && str.indexOf('&') < 0) { return str; }

  return str.replace(UNESCAPE_ALL_RE,
    (match, escaped: string | undefined ) => {
      if (escaped) { return escaped; }
      return decodeHTML5(match);
    });
}