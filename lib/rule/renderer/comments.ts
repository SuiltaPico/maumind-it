import { RendererRuleProcessor } from "../../renderer/Renderer";

const comments: RendererRuleProcessor = (tokens, index, options, env, renderer) => {
  const token = tokens[index];

  if (token.hidden) {
    return ""
  }

  return "<!--" + token.content + "-->\n";
};

export default comments