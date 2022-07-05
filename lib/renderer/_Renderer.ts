import { } from "lodash"
import { nanoid } from "nanoid"
import { MaudownItEnv, MaudownItOption } from ".."
import { escape_HTML } from "../common/html_escape"
import { hardbreak, softbreak } from "../rule/renderer/break"
import { code_block, code_inline } from "../rule/renderer/code"
import comments from "../rule/renderer/comments"
import extension_block from "../rule/renderer/extension_block"
import fence from "../rule/renderer/fence"
import { html_block, html_inline } from "../rule/renderer/html"
import image from "../rule/renderer/image"
import latex from "../rule/renderer/latex"
import text from "../rule/renderer/text"
import RulerMap from "../Ruler/RulerMap"
import Token, { Nesting } from "../Token"
import RendererWorkerRenderer from "./_RendererWorker"

/** 
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
  renderer: RendererWorkerRenderer
) => string

export type RendererPromiseRuleProcessor = (
  tokens: Token[],
  index: number,
  options: MaudownItOption,
  env: MaudownItEnv,
  renderer: RendererWorkerRenderer
) => Promise<string>

export type RendererAfterRenderTask = {
  type: string
  data: string
}

const rules = {
  comments,
  code_inline,
  code_block,
  fence,
  image,
  hardbreak,
  softbreak,
  text,
  html_block,
  html_inline,
  latex: [latex],
  extension_block: [extension_block],
} as {
  [name: string]: RendererRuleProcessor | [RendererPromiseRuleProcessor]
}

/** 渲染器 */
export default class Renderer {
  after_render_tasks: (() => Promise<void>)[] = []
  workers: Worker[]
  worker_available = true

  constructor() {
    this.workers = new Array(Math.max(navigator.hardwareConcurrency || 2 - 1, 1))
    
    try {
      for (let i = 0; i < this.workers.length; i++) {
        this.workers[i] = new Worker(new URL('./RendererWorker.ts', import.meta.url), {
          type: 'module'
        })
      }
    } catch (e) {
      console.warn("Worker 启用失败：", e)
      this.worker_available = false
    }
  }

  async render(tokens: Token[], options: MaudownItOption, env: MaudownItEnv) {
    console.time('render')

    // 一个批次的渲染最少分得 500 个 token，否则浪费性能
    const batch_size = Math.max(Math.ceil(tokens.length / this.workers.length), 700)

    const promises: Promise<void>[] = []
    const id_indexes: string[] = []

    const result = Array(Math.ceil(tokens.length / batch_size))

    let start = 0
    for (let end = 0, i = 0; end < tokens.length; i++) {
      start = end
      end += batch_size

      const id = nanoid()

      id_indexes.push(id)

      this.workers[i].postMessage({
        type: "render",
        id,
        tokens: tokens.slice(start, Math.min(tokens.length, end + 1)),
        start,
        env,
        options
      })

      promises.push(new Promise((resolve, reject) => {
        const listener = (
          event: MessageEvent<{
            type: "Rendering complete", id: string, result: string, after_render_tasks: RendererAfterRenderTask[]
          } | {
            type: "Rendering error", id: string, error: string
          }>
        ) => {

          const index = id_indexes.findIndex(id => id === event.data.id)
          if (index === -1) { return }

          if (event.data.type === "Rendering complete") {
            result[index] = event.data.result
            resolve()
          } else if (event.data.type === "Rendering error") {
            reject(event.data.error)
          }
          this.workers[i].removeEventListener("message", listener)
        }
        this.workers[i].addEventListener("message", listener)
      }))
    }

    await Promise.all(promises)
    const r = result.join("")
    //console.log(r)
    console.timeEnd('render')

    return r;
  }

  run_after_render_tasks() {
    console.log('run_after_render_tasks');

    return Promise.all(this.after_render_tasks.map(task => task()))
  }
}