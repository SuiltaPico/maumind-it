import katex, { KatexOptions } from "katex"
import { MaudownItEnv } from ".."
import("katex/dist/katex.min.css")
import(`katex/dist/fonts/KaTeX_Main-Regular.woff2`)
import(`katex/dist/fonts/KaTeX_Main-Bold.woff2`)
import(`katex/dist/fonts/KaTeX_Math-Italic.woff2`)
import(`katex/dist/fonts/KaTeX_Size1-Regular.woff2`)
import(`katex/dist/fonts/KaTeX_Size2-Regular.woff2`)
import(`katex/dist/fonts/KaTeX_AMS-Regular.woff2`)
import(`katex/dist/fonts/KaTeX_Script-Regular.woff2`)
import(`katex/dist/fonts/KaTeX_Size1-Regular.woff2`)

export async function render_latex(src: string, env: MaudownItEnv, options?: KatexOptions) {
  const render = env.latex_render
  if (render === "katex") {
    return katex.renderToString(src, {
      throwOnError: false,
      strict: false,
      output: "html",
      ...options
    })
    //}
    // else if (render === "mathjax") {
    //   // const { mathjax } = await import('mathjax-full/ts/mathjax');
    //   // const { TeX } = await import('mathjax-full/ts/input/tex');
    //   // const { SVG } = await import('mathjax-full/ts/output/svg');
    //   // const { liteAdaptor } = await import('mathjax-full/ts/adaptors/liteAdaptor');
    //   // const { RegisterHTMLHandler } = await import('mathjax-full/ts/handlers/html');

    //   // const tex = new TeX({ packages: ['base', 'ams'] });
    //   // const svg = new SVG({ fontCache: 'none' });
    //   // const html = mathjax.document('', { InputJax: tex, OutputJax: svg });
    //   // const adaptor = liteAdaptor();
    //   // RegisterHTMLHandler(adaptor as any);

    //   const { mathjax } = await import('mathjax');

    //   try {
    //     const node = html.convert(content, { display: false });
    //     return adaptor.outerHTML(node);
    //   }
    //   catch (error) {
    //     return content;
    //   }
  } else {
    throw new Error("未定义的 latex_render：" + env.latex_render);
  }
}