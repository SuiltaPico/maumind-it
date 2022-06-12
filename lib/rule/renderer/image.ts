import { RendererRuleProcessor } from "../../renderer/Renderer";

const image: RendererRuleProcessor = (tokens, index, options, env, renderer) => {
  var token = tokens[index];

  // 必须设置 `alt` 属性，即使为空。因为它是强制性的，应该放在适当的位置进行测试。

  token.attrs["alt"] =
    renderer.render_inline_as_text(token.children!, options, env);

  return renderer.render_token(tokens, index, options, env);
};

export default image

