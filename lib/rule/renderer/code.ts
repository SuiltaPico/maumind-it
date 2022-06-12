import { escape_HTML } from "../../common/html_escape";
import { RendererRuleProcessor } from "../../renderer/Renderer";

export const code_inline: RendererRuleProcessor = (tokens, index, options, env, renderer) => {
  let token = tokens[index];

  return '<code' + renderer.render_attrs_from_token(token) + '>' +
    escape_HTML(tokens[index].content) +
    '</code>';
};


export const code_block: RendererRuleProcessor = (tokens, index, options, env, renderer) => {
  let token = tokens[index];

  return '<pre' + renderer.render_attrs_from_token(token) + '><code>' +
    escape_HTML(tokens[index].content) +
    '</code></pre>\n';
};