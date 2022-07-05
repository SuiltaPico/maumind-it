import { MaudownItEnv, MaudownItOption } from ".."
import { escape_HTML } from "../common/html_escape"
import { Serializable } from "../common/types"
import { hardbreak, softbreak } from "../rule/renderer/break"
import { code_block, code_inline } from "../rule/renderer/code"
import comments from "../rule/renderer/comments"
import extension_block from "../rule/renderer/extension_block"
import fence from "../rule/renderer/fence"
import { html_block, html_inline } from "../rule/renderer/html"
import image from "../rule/renderer/image"
import latex from "../rule/renderer/latex"
import text from "../rule/renderer/text"
import Token, { Nesting } from "../Token"
import { AFTData, RendererPromiseRuleProcessor, RendererRuleProcessor } from "./Renderer"

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
  [name: string]: RendererRuleProcessor | [
    RendererPromiseRuleProcessor
  ]
}

/** 渲染器 */
export default class RendererProcessor {
  after_render_tasks: AFTData[] = []
  id;
  #last_date = 0;
  #id_offset = 0;

  constructor(id: string) {
    this.id = id;
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
    let result: string[]

    let token_num = tokens.length
    for (var i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i]
      if (token.children !== undefined) {
        token_num += token.children.length
      }
    }

    result = Array(token_num)

    for (var i = 0, ti = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const type = token.type;
      const rule_info = rules[type];


      if (Array.isArray(rule_info)) {
        result[ti] = await rule_info[0](tokens, i, options, env, this)
      } else if (rule_info) {
        result[ti] = rule_info(tokens, i, options, env, this)
      } else {
        result[ti] = this.render_token(tokens, i, options, env)
      }

      ti++

      if (token.children !== undefined) {
        const tokens = token.children;
        for (let x = 0; x < token.children.length; x++, ti++) {
          if (Array.isArray(rule_info)) {
            result[ti] = await rule_info[0](tokens, x, options, env, this)
          } else if (rule_info) {
            result[ti] = rule_info(tokens, x, options, env, this)
          } else {
            result[ti] = this.render_token(tokens, x, options, env)
          }
        }
      }
    }

    return result.join('')
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

    result += '>'

    return result;
  };

  async render(tokens: Token[], options: MaudownItOption, env: MaudownItEnv) {
    const result = Array(tokens.length)

    for (let i = 0; i < tokens.length; i++) {
      const type = tokens[i].type;
      if (type === 'inline') {
        result[i] = await this.render_inline(tokens[i].children!, options, env);
      } else if (rules[type] !== undefined) {
        // 以自定义的渲染规则渲染 token
        const rule_processor = rules[type];

        if (Array.isArray(rule_processor)) {
          result[i] = await rule_processor[0](tokens, i, options, env, this)
        } else {
          result[i] = rule_processor(tokens, i, options, env, this)
        }
      } else {
        // 否则使用默认的渲染规则
        result[i] = this.render_token(tokens, i, options, env)
      }
    }

    const r = result.join('')
    return r
  }

  generate_available_id() {
    let id: any = Date.now()
    if (id === this.#last_date) {
      this.#last_date = id
      id += this.#id_offset.toString()
      this.#id_offset++
    }
    return this.id + id
  }

  push_AFT(type: string, data: Serializable){
    this.after_render_tasks.push([type, data])
  }
}