import { escape_HTML } from "../../common/html_escape";
import { RendererRuleProcessor } from "../../renderer/Renderer"

let text: RendererRuleProcessor = (tokens, index) => {
  return escape_HTML(tokens[index].content);
}
export default text