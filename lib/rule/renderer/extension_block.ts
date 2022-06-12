import { MaudownItEnv } from "../..";
import { UnwrapPromise } from "../../common/types";
import { RendererRuleProcessor } from "../../renderer/Renderer";
import html from "./extension/html";
import latex from "./extension/latex";

export type EXBRendererRuleProcessor = (header: string, content: string, env: MaudownItEnv, block: boolean) => Promise<string | false>;

const render_list: EXBRendererRuleProcessor[] = [
  latex,
  html
]

const extension_block: RendererRuleProcessor = async (
  tokens,
  index,
  options,
  env,
  renderer
) => {
  const token = tokens[index]
  const promise_list = []

  for (const i in render_list) {
    const rule = render_list[i]
    promise_list.push(rule(token.info ?? "", token.content, env, true))
  }

  const all_res = (await Promise.all(promise_list))

  for (const res of all_res) {
    if (res !== false) return res
  }

  return ""
}

export default extension_block;