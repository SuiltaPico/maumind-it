import { RendererRuleProcessor } from "../../renderer/Renderer";

const html: RendererRuleProcessor = function (tokens, index) {
  return tokens[index].content;
};

export const html_block = html
export const html_inline = html