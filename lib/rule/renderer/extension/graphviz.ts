import { graphviz } from "@hpcc-js/wasm"
import { EXBRendererRuleProcessor } from "../extension_block"

const graphviz_render: EXBRendererRuleProcessor = async (header, content, env, block) => {
  // if (header === "viz") {
  //   return await graphviz.dot(content)
  // }
  // return false
}

export default graphviz_render