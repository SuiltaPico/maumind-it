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
  renderer: Renderer
) => Promise<string> | string

const rules = [
  ["comments", comments],
  ["code_inline", code_inline],
  ["code_block", code_block],
  ["fence", fence],
  ["image", image],
  ["hardbreak", hardbreak],
  ["softbreak", softbreak],
  ["text", text],
  ["html_block", html_block],
  ["html_inline", html_inline],
  ["extension_block", extension_block],
  ["latex", latex]
] as const

/** 渲染器 */
export default class Renderer {
  ruler = new RulerMap<RendererRuleProcessor>()

  constructor() {
    rules.forEach(r => {
      this.ruler.push([r[0], r[1]])
    })
  }

  /** 渲染 attribute */
  render_attrs(attrs: Token["attrs"]) {
    let result = "";
    for (const [name, value] of Object.entries(attrs)) {
      result += ` ${escape_HTML(name)}="${escape_HTML(value)}"`;
    }
    return result;
  }

  /** 渲染 `token` 的 attribute */
  render_attrs_from_token(token: Token) {
    return this.render_attrs(token.attrs);
  };

  async render_inline(tokens: Token[], options: MaudownItOption, env: MaudownItEnv) {
    let rules = this.ruler.get_rules_fn()

    const promises: (Promise<string> | string)[] = []

    for (var i = 0, len = tokens.length; i < len; i++) {
      let type = tokens[i].type;
      if (rules[type] !== undefined) {
        promises.push(rules[type](tokens, i, options, env, this));
      } else {
        promises.push(this.render_token(tokens, i, options, env));
      }
    }

    const result = (await Promise.all(promises)).join("")

    return result;
  };

  /** 渲染 token 为文本。（为 img 服务的）
   * 
   * 图像“alt”属性的特殊组合，以符合 CommonMark 规范。
   * 不要尝试使用它！规范要求显示带有剥离标记的“alt”内容，而不是简单的转义。
   * @deprecated
   */
  render_inline_as_text(tokens: Token[], options: MaudownItOption, env: MaudownItEnv) {
    let result = "";

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === 'text') {
        result += tokens[i].content;
      } else if (tokens[i].type === 'image') {
        result += this.render_inline_as_text(tokens[i].children!, options, env);
      } else if (tokens[i].type === 'softbreak') {
        result += '\n';
      }
    }

    return result;
  }

  /** 以默认的方法渲染整个 token */
  render_token(tokens: Token[], index: number, options: MaudownItOption, env: MaudownItEnv) {
    let result = ''
    let token = tokens[index]

    // 紧凑列表段落
    if (token.hidden) {
      return '';
    }

    // 添加令牌名称，例如：`<img` 。
    result += (token.nesting === Nesting.Closing ? '</' : '<') + token.tag;

    // 编码属性，例如：`<img src="foo"` 。
    result += this.render_attrs_from_token(token);

    // 为自动关闭标记添加斜杠，例如：`<img src="foo" /`。
    if (token.nesting === Nesting.SelfClosing && options.xhtmlOut) {
      result += ' /';
    }

    // let need_LF = false

    // // 检查是否需要在此标记后添加换行符
    // if (token.block) {
    //   need_LF = true;

    //   if (token.nesting === Nesting.Opening) {
    //     if (index + 1 < tokens.length) {
    //       let next_token = tokens[index + 1];

    //       if (next_token.type === 'inline' || next_token.hidden) {
    //         // 包含内联标记的块级标记。
    //         need_LF = false;

    //       } else if (next_token.nesting === Nesting.Closing && next_token.tag === token.tag) {
    //         // 相同类型的开始标记 + 结束标记。例如：`<li></li>`。
    //         need_LF = false;
    //       }
    //     }
    //   }
    // }

    // result += need_LF ? '>\n' : '>';
    result += '>'

    return result;
  };

  async render(tokens: Token[], options: MaudownItOption, env: MaudownItEnv) {
    console.time('render')
    const rules = this.ruler.get_rules_fn()
    const promises: (Promise<string> | string)[] = []

    for (let i = 0; i < tokens.length; i++) {
      const type = tokens[i].type;

      if (type === 'inline') {
        promises.push(this.render_inline(tokens[i].children!, options, env));
      } else if (rules[type] !== undefined) {
        // 以自定义的渲染规则渲染 token
        promises.push(rules[type](tokens, i, options, env, this));
      } else {
        // 否则使用默认的渲染规则
        promises.push(this.render_token(tokens, i, options, env));
      }
    }

    const result = (await Promise.all(promises)).join("")

    console.timeEnd('render')
    return result;
  }
}