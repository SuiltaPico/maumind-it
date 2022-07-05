// import abcjs from "abcjs";

import { EXBRendererRuleProcessor } from "../extension_block"

const abc: EXBRendererRuleProcessor = async (header, content, env, block) => {
  if (header === "abc") {
    // @ts-ignore
    // console.log(window.f = abcjs.renderAbc("*", content))
  }
}

export default abc