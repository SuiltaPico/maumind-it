import { escape_HTML, unescape_all } from "../../common/html_escape";
import { RendererRuleProcessor } from "../../renderer/Renderer";

const fence: RendererRuleProcessor = (tokens, index, options, env, renderer) => {
  let token = tokens[index],
    info = token.info ? unescape_all(token.info).trim() : '',
    lang_name = '',
    lang_attrs = ''

  if (info) {
    let arr = info.split(/(\s+)/g);
    lang_name = arr[0];
    lang_attrs = arr.slice(2).join('');
  }

  let highlighted: string;

  if (options.highlight) {
    highlighted = options.highlight(token.content, lang_name, lang_attrs) || escape_HTML(token.content);
  } else {
    highlighted = escape_HTML(token.content);
  }

  if (highlighted.indexOf('<pre') === 0) {
    return highlighted + '\n';
  }

  return '<pre><code' + renderer.render_attrs_from_token(token) + '>'
    + highlighted
    + '</code></pre>\n';
};

export default fence