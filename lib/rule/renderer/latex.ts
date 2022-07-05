import { render_latex } from "../../common/render_latex";
import { RendererPromiseRuleProcessor } from "../../renderer/Renderer";

const latex: RendererPromiseRuleProcessor = async (
  tokens, index, options, env, renderer
) => {
  const token = tokens[index]
  const content = token.content;
  return `<span class="latex">${await render_latex(content, env, {
    displayMode: token.markup!.length === 2 ? true : false
  })}</span>`;
}

export default latex