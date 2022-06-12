// 匹配 HTML 元素的正则表达式

const attr_name = '[a-zA-Z_:][a-zA-Z0-9:._-]*';

const unquoted = '[^"\'=<>`\\x00-\\x20]+';
const single_quoted = "'[^']*'";
const double_quoted = '"[^"]*"';

/** 属性值 */
const attr_value = '(?:' + unquoted + '|' + single_quoted + '|' + double_quoted + ')';

/** 属性 */
const attribute = '(?:\\s+' + attr_name + '(?:\\s*=\\s*' + attr_value + ')?)';

/** 标签开启 */
const open_tag = '<[A-Za-z][A-Za-z0-9\\-]*' + attribute + '*\\s*\\/?>';

/** 标签关闭 */
const close_tag = '<\\/[A-Za-z][A-Za-z0-9\\-]*\\s*>';

/** 注释 */
const comment = '<!---->|<!--(?:-?[^>-])(?:-?[^-])*-->';

/** 处理指令 */
const processing = '<[?][\\s\\S]*?[?]>';

/** HTML 声明，如 `<!DOCTYPE html>` */
const declaration = '<![A-Z]+\\s+[^>]*>';

/** 不应该被解析的字符数据 */
const cdata = '<!\\[CDATA\\[[\\s\\S]*?\\]\\]>';

export const HTML_TAG_RE = new RegExp(
  '^(?:' + open_tag
  + '|' + close_tag
  + '|' + comment
  + '|' + processing
  + '|' + declaration
  + '|' + cdata
  + ')'
);
export const HTML_OPEN_CLOSE_TAG_RE = new RegExp(
  '^(?:' + open_tag + '|' + close_tag + ')'
);