import katex, { KatexOptions } from "katex"
import { MaudownItEnv } from ".."

export async function render_latex(src: string, env: MaudownItEnv, options?: KatexOptions) {
  const render = env.latex_render
  if (render === "katex") {
    return katex.renderToString(src, {
      throwOnError: false,
      strict: false,
      output: "html",
      ...options
    })
  } else {
    throw new Error("未定义的 latex_render：" + env.latex_render);
  }
}