import { MaudownItEnv, MaudownItOption } from "../..";
import { RendererPromiseRuleProcessor } from "../../renderer/Renderer";
import html from "./extension/html";
import latex from "./extension/latex";
import graphviz_render from "./extension/graphviz";
import abc from "./extension/abc";
import RulerMap from "../../Ruler/RulerMap";
import RendererProcessor from "../../renderer/RendererProcessor";

export type EXBRendererRuleProcessor = (
  header: string, content: string, options: MaudownItOption, env: MaudownItEnv, block: boolean,
  renderer_processor: RendererProcessor
) => string;

export type EXBRendererPromiseRuleProcessor =
  (...params: Parameters<EXBRendererRuleProcessor>) => Promise<ReturnType<EXBRendererRuleProcessor>>;


const ruler = new RulerMap<EXBRendererRuleProcessor | EXBRendererPromiseRuleProcessor>({
  latex,
  html,
  graphviz_render,
  abc
})

const extension_block: RendererPromiseRuleProcessor = async (
  tokens,
  index,
  options,
  env,
  renderer_processor
) => {
  const token = tokens[index]
  const ruler_map = ruler.get_rules_fn(token.info)

  const type = token.info!.split(" ")[0]

  return ruler_map[type](token.info!, token.content, options, env, true, renderer_processor)
}

export default extension_block;