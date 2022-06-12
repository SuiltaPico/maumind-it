import { render_latex } from "../../../common/render_latex"
import { EXBRendererRuleProcessor } from "../extension_block"

const latex: EXBRendererRuleProcessor = async (header, content, env, block) => {
  if (header === "latex" || header === "$") {
    return await render_latex(content, env, {
      displayMode: block
    })
  }
  return false
}

export default latex