import { } from "lodash"
import { nanoid } from "nanoid"
import { MaudownItEnv, MaudownItOption } from ".."
import { Serializable } from "../common/types"
import RulerMap from "../Ruler/RulerMap"
import Token from "../Token"
import RendererProcessor from "./RendererProcessor"

/** 渲染后任务的规则表。可以修改此列表 */
export const after_render_rules = new RulerMap<(data: Serializable) => Promise<void>>()

/** 渲染规则的处理函数。
 * 
 * 该类型函数不应访问 DOM。该类操作可以通过向 `renderer_processor` 添加渲染后任务以进行后续操作。
 * 
 * 在某些渲染目标为非浏览器的情况下，渲染后任务可能无法正常执行。
 * 应当在库中提前检查环境，并准备好代替的输出结果。
 * @param tokens
 * @param index token 索引
 * @param options 选项
 * @param renderer 渲染器实例
 * @returns 是否与规则匹配成功 */
export type RendererRuleProcessor = (
  tokens: Token[],
  index: number,
  options: MaudownItOption,
  env: MaudownItEnv,
  renderer_processor: RendererProcessor
) => string

/** 支持 Promise 的渲染规则的处理函数。
 * 
 * 该类型函数不应访问 DOM。该类操作可以通过向 `renderer_processor` 添加渲染后任务以进行后续操作。
 * 
 * 在某些渲染目标为非浏览器的情况下，渲染后任务可能无法正常执行。
 * 应当在库中提前检查环境，并准备好代替的输出结果。
 * @param tokens
 * @param index token 索引
 * @param options 选项
 * @param renderer 渲染器实例
 * @returns 是否与规则匹配成功 */
export type RendererPromiseRuleProcessor =
  (...params: Parameters<RendererRuleProcessor>) => Promise<ReturnType<RendererRuleProcessor>>;


/** 渲染后任务数据。由渲染规则的处理函数生成。 */
export type AFTData = [string, Serializable]

function generate_AFT_runner(datas: AFTData[]) {
  const rules = after_render_rules.get_rules_fn()
  return function run_after_render_tasks() {
    for (let i = 0; i < datas.length; i++) {
      const [name, data] = datas[i];
      const rule = rules[name]
      if (!rule) { continue }

      rule(data)
    }
  }
}

/** 渲染器 */
export default class Renderer {
  async render(tokens: Token[], options: MaudownItOption, env: MaudownItEnv) {
    console.time('render')

    const processor = new RendererProcessor(nanoid())
    const result = await processor.render(tokens, options, env)

    console.timeEnd('render')
    return [result, processor.after_render_tasks ?
      generate_AFT_runner(processor.after_render_tasks) : undefined
    ] as const
  }

  async render_inline(tokens: Token[], options: MaudownItOption, env: MaudownItEnv) {
    console.time('render_inline')

    const processor = new RendererProcessor(nanoid())
    const result = await processor.render_inline(tokens, options, env)

    console.timeEnd('render_inline')

    return [result, processor.after_render_tasks ?
      generate_AFT_runner(processor.after_render_tasks) : undefined
    ] as const
  }
}