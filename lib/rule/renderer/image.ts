import { RendererRuleProcessor } from "../../renderer/Renderer";

const image: RendererRuleProcessor = (tokens, index, options, env, renderer) => {
  return renderer.render_token(tokens, index, options, env);
};

export default image

