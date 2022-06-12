import Token, { Nesting } from "../Token";
import is_space from "../common/is_space"
import MaudownIt, { MaudownItEnv } from "..";
import State from "./State";
import {
  count_indent, IndentInfo, IndentMode,
  IndentSize, match_indent_mode, split_indent
} from "../common/indent";
import get_available_key, { get_available_keys } from "../common/get_available_key";
import string_trim_clips from "../common/string_trim_clip";
import { Optional } from "../common/types";
import { BlockRuleProcessor } from "../parser/ParserBlock";

export type ParentType = 'blockquote' | 'list' | 'root' | 'paragraph' | 'reference';

export type BlockStateProps = {
  [P in keyof BlockState]: BlockState[P]
}

/** 处理块时使用的状态储存类。
 * 
 * 当 `ParserBlock` 处理块时，该类的实例会被传给每个规则。
 */
export default class BlockState extends State {
  /** 每行缩进单元的数量 */
  readonly indent_count: number[] = []

  /** 需要的块内容缩进（例如，如果我们在一个列表中，它将被定位在列表标记之后）*/
  block_indent = 0;

  /** content_src 中当前的行索引 */
  line_index = 0;

  /** 最大行数 */
  readonly line_count;

  /** 列表的松/紧模式 */
  tight = false;

  /** 当前 dd 块的缩进（如果没有，则为 -1） */
  ddIndent = -1;

  /** 当前列表块的缩进（如果没有，则为 -1）*/
  listIndent = -1;

  pos = 0;

  /** 可以是 'blockquote'、'list'、'root'、'paragraph' 或 'reference' 在列表中用于确定它们是否中断段落 */
  parent_type: ParentType = "root";

  /** 嵌套等级 */
  level = 0;

  /** 内容源码，没有缩进。 */
  readonly cs_arr: string[]

  /** 内容源码长度 */
  readonly cs_len: number

  /** 内容源码 */
  readonly content_src: string

  readonly line_begin_index: number[]

  section_infos: [name: string, level: number, relative_level?: number][] = []

  rr_indexes: number[] = []

  prefix_stack: string[] = []

  props_history_stack: Optional<BlockStateProps>[] = [{}]

  constructor(src: string, md: MaudownIt, env: MaudownItEnv, tokens: Token[]) {
    super(src, md, env)
    console.time("block_state_init")
    this.tokens = tokens;

    let indent_info: IndentInfo = {
      mode: env.indent_info.mode,
      size: env.indent_info.size
    }

    // 内容保护块里可能包含注释代码，注释里也可能包含内容保护块的代码
    // 缩进如果没有预设，应该从是非内容保护块非注释的第一行代码获取。

    // 内容保护块前面不能有字符。注释前面可以有任意字符。

    /** 需要检测的正则，由于 ECMA 正则会吞字符的问题，需要独立匹配缩进。 */
    const RegExps = {
      /** 注释开始。匹配组：
       * 1. 边界标识 */
      comments_start: /(?<cms_bdi>[\-]*)\/\*/,
      /** 注释结束。匹配组：
       * 1. 边界标识 */
      comments_end: /\*\/(?<cme_bdi>[\-]*)/,
      /** 扩展块开始。匹配组：
       * 1. 边界标识
       * 2. 扩展块头 */
      exblock_start: /(?<exs_bdi>[\-]*)\/([^{]+|\{[^{]+)\{{2}/,
      /** 扩展块结束。匹配组：
       * 1. 边界标识 */
      exblock_end: /\}{2}\/(?<exe_bdi>[\-]*)$/,
      /** 围栏块开始。匹配组：
       * 1. 边界标识 */
      fcblock_start: /(?<fcs_bdi>[\-]*)\`{3}/,
      /** 围栏块结束。匹配组：
       * 1. 边界标识 */
      fcblock_end: /\`{3}(?<fce_bdi>[\-]*)$/,
    } as const

    const indent_RE = /^(?:(?:[ ]*)|(?:[\t]*))/gm

    // 将 `RegExps` 合并成一个具名正则表达式，并全局多行匹配

    let re_src_arr: string[] = []
    Object.entries(RegExps).forEach(([name, re]) => {
      re_src_arr.push(`(?<${name}>` + re.source + ")")
    })
    const RE = new RegExp(re_src_arr.join("|"), "gm")
    let match_result = [...src.matchAll(RE)]
    let indent_result = [...src.matchAll(indent_RE)]

    // 收集要寻找的标记信息，每行第一个是 indent_src

    type MarkInfo = {
      type: keyof typeof RegExps | "indent_src",
      value: {
        /** 匹配项在源码的索引 */
        index: number
        /** 整个匹配项的长度 */
        length: number
        [key: string]: string | number
      }
    }
    const marks: MarkInfo[] = []

    //console.log("re", RE)

    match_result.forEach(r => {
      const available_named_group: { [key: string]: string } = {}

      get_available_keys(r.groups!).forEach(k => {
        available_named_group[k] = r.groups![k]
      })

      marks.push({
        type: get_available_key(r.groups!) as keyof typeof RegExps,
        value: {
          ...available_named_group,
          index: r.index!,
          length: r[0].length
        }
      })
    });

    for (let i = 0; i < indent_result.length; i++) {
      const r = indent_result[i];
      marks.push({
        type: "indent_src",
        value: {
          index: r.index!,
          length: r[0].length
        }
      })
    }

    function get_mi_value_prop_length<T extends MarkInfo>(name: string, mi: T) {
      return (mi.value[name] as string ?? "").length ?? 0
    }

    // 识别内容保护块、注释、缩进

    type BlockType = "" | "comments" | "fc" | "ex" | "indent"
    type StateBlockType = Exclude<BlockType, "indent">

    const state = {
      bd_ident_num: 0,
      block_indent: 0,
      block_type: "" as StateBlockType,
      block_start: -1,
    }

    type BlockInfo = {
      type: BlockType,
      /** 片段的起始字符的位置 */
      start: number,
      /** 片段的结束字符的位置 */
      end: number
    }
    /** 包含以下 `src` 段的信息：
     * * `indent`：maudown 的有效缩进信息。注释和内容保护块的内容不计。
     * * `comments`：注释
     * * `fc`：围栏块
     * * `ex`：扩展块
     */
    const block_infos: BlockInfo[] = []

    function push_to_block_infos(type: Exclude<BlockType, "">, end: number, start?: number) {
      return block_infos.push({
        type, end,
        start: start === undefined ? state.block_start : start,
      })
    }

    /** 当前 block_type 为 indent */
    function not_in_block() {
      return !state.block_type
    }

    /** 当前 mask 是否位于行起始。忽略缩进。
     * @param src_index 源代码的字符索引
     */
    function is_at_line_begin(src_index: number) {
      for (let i = block_infos.length - 1; i > -1; i--) {
        const bi = block_infos[i];
        // 判断能否接上上一个 block_infos 的 end
        if (bi.end === src_index && bi.type === "indent") {
          return true
        } else { break }
      }
      return false
    }

    /** 获取 `block_infos` 的最后一个缩进段信息 */
    function get_last_indent() {
      for (let i = block_infos.length - 1; i > -1; i--) {
        const bi = block_infos[i];
        if (bi.type === "indent") { return bi }
      }
    }

    /** 尝试获取上一个缩进段的缩进数
     * @return 没有缩进段则为 0
     */
    function try_count_last_indent() {
      const last_indent = get_last_indent()
      if (last_indent && last_indent.start - last_indent.end !== 0) {
        return count_indent(
          src.slice(last_indent.start, last_indent.end),
          indent_info
        )
      }
      return 0
    }

    /** 如果缩进模式为 `IndentMode.Unknown` ，尝试利用 `src` 进行缩进匹配 */
    function try_match_indent(src: string) {
      if (src && indent_info.mode === IndentMode.Unknown) {
        indent_info = { ...indent_info, ...match_indent_mode(src) }
        env.indent_info.mode = indent_info.mode
        env.indent_info.size = indent_info.size
      }
    }

    function cpblock_start(block_type: Exclude<StateBlockType, "">, bdi_name: string, m: MarkInfo) {
      if (is_at_line_begin(m.value.index) && not_in_block()) {
        state.block_type = block_type
        state.bd_ident_num = get_mi_value_prop_length(bdi_name, m)
        state.block_start = m.value.index
        state.block_indent = try_count_last_indent()
      }
    }

    function cpblock_end(block_type: Exclude<StateBlockType, "">, bdi_name: string, m: MarkInfo) {
      if (state.block_type === block_type
        && get_mi_value_prop_length(bdi_name, m) === state.bd_ident_num
        && try_count_last_indent() === state.block_indent
      ) {
        push_to_block_infos(block_type, m.value.index + m.value.length)
        state.block_type = ""
      }
    }

    // 扩展该 switch 的注意事项：
    // 1. `_start` 修改的元素必须与 `_end` 读取的元素能对的上
    // 2. `_end` 结束必须执行 state.block_type = ""
    marks.forEach((m) => {
      switch (m.type) {
        case "indent_src":
          let indent_src = src.slice(m.value.index, m.value.index + m.value.length)
          if (not_in_block()) {
            push_to_block_infos("indent", m.value.index + m.value.length, m.value.index)
            try_match_indent(indent_src) // 尝试确认缩进模式
          } else if (state.block_indent
            && state.block_type === "ex" || state.block_type === "fc"
          ) {
            // 根据 state.block_indent 拆分缩进
            let [indent] = split_indent(indent_src, state.block_indent, indent_info)
            push_to_block_infos("indent", m.value.index + indent.length, m.value.index)
            try_match_indent(indent)  // 尝试确认缩进模式
          }
          break
        case "comments_start":
          cpblock_start("comments", "cms_bdi", m)
          break
        case "comments_end":
          cpblock_end("comments", "cme_bdi", m)
          break
        case "exblock_start":
          cpblock_start("ex", "exs_bdi", m)
          break
        case "exblock_end":
          cpblock_end("ex", "exe_bdi", m)
          break
        case "fcblock_start":
          cpblock_start("fc", "fcs_bdi", m)
          break
        case "fcblock_end":
          cpblock_end("fc", "fce_bdi", m)
          break
        default:
          throw new Error(`The ${m.type} type of processing scheme is not defined`);
      }
    })

    //console.log("marks", marks)
    //console.log("block_infos", block_infos)

    // 清除注释
    let content_src: string = ""
    let bi_len_count = 0

    function remove_from_content_src(bis: BlockInfo[]) {
      const pairs: [number, number][] = []
      for (const bi of bis) {
        bi.start -= bi_len_count
        bi.end -= bi_len_count
        pairs.push([bi.start, bi.end])
        bi_len_count += (bi.end - bi.start)
      }
      content_src = string_trim_clips(src, pairs)
    }


    const indents_bi = block_infos.filter((bi) => bi.type === "indent")

    remove_from_content_src(indents_bi.filter((bi) => (bi.end - bi.start) > 0))
    //console.log(content_src)

    indents_bi.forEach((bi, i) => {
      if (indent_info.mode === IndentMode.Unknown) {
        this.indent_count.push(0)
      } else {
        this.indent_count.push(count_indent(
          content_src.slice(bi.start, bi.end),
          indent_info
        ))
      }
    })

    //console.log(content_src)
    //console.log("indent_count", this.indent_count)

    this.content_src = content_src
    let index = 0
    this.line_begin_index = []

    const cs_arr = content_src.split("\n")
    this.cs_arr = cs_arr

    for (let i = 0; i < cs_arr.length; i++) {
      const cs_line = cs_arr[i]
      this.line_begin_index.push(index)
      index += cs_line.length
    }

    this.line_count = this.cs_arr.length
    this.cs_len = index
    console.timeEnd("block_state_init")
  }

  // 将新 Token 推送到流。
  push(type: string, tag: string, nesting: Nesting) {
    let token = new Token(type, tag, nesting);
    token.block = true;

    if (nesting === Nesting.Closing) this.level--;
    token.level = this.level;
    if (nesting === Nesting.Opening) this.level++;

    this.tokens.push(token);
    return token;
  };

  push_and_create_closer(type: string, tag: string) {
    let token = this.push(type + "_open", tag, Nesting.Opening);
    return {
      open_token: token,
      closer: () => this.push(type + "_close", tag, Nesting.Closing),
    }
  }

  /** 判断行 `line` 是否为空行 */
  is_empty_line(line: number) {
    return this.cs_arr[line] === "";
  };

  /** 获取行 `line` 后面的第一个非空行的行号，如果找不到则返回 -1 */
  skip_empty_line(from: number) {
    let max = this.cs_arr.length
    for (; from < max; from++) {
      if (!this.is_empty_line(from)) { break; }
    }
    if (from < max) { return from; }
    else { return -1 }
  };

  /** 获取从位置 `pos` 开始，第一个不等于 `code` 的字符的位置
   * @param code 要跳过的字符码或数组。
   * @param max 最大查找位置 + 1
   * @returns 跳转到的位置，若跳转失败则为 `-1`
   */
  skip_chars(pos: number, code: number | number[], max = this.cs_len) {
    if (pos > 0) {
      switch (typeof code) {
        case "number":
          for (; pos < max; pos++) {
            if (code !== this.content_src.charCodeAt(pos)) return pos;
          }
          break;
        case "object":
          for (; pos < max; pos++) {
            let ch = this.content_src.charCodeAt(pos);
            if (code.indexOf(ch) < 0) return pos;
          }
          break;
      }
    }
    return -1;
  };

  /** 获取从位置 `pos` 开始，第一个 `skip_when` 判定为 `false` 的字符的位置
   * @param skip_when 判断 `cur_code` 为要跳过的字符时应返回 `true`，否则应返回 `false`。
   * @param max 最大查找位置 + 1
   * @returns 跳转到的位置，若跳转失败则为 `-1`
   */
  skip_with(pos: number, skip_when: ((cur_code: number) => boolean), max = this.cs_len) {
    if (pos > 0) {
      for (; pos < max; pos++) {
        if (!skip_when(this.content_src.charCodeAt(pos))) return pos;
      }
    }
    return -1;
  }

  /** 获取从位置 `pos` 开始，逆向第一个不等于 `code` 的字符的位置
   * @param code 要跳过的字符码或数组。
   * @param min 最小查找位置 - 1
   * @returns 跳转到的位置，若跳转失败则为 `-1`
   */
  skip_chars_back(pos: number, code: number | number[], min = -1) {
    if (pos < this.cs_len) {
      switch (typeof code) {
        case "number":
          for (; pos > min; pos--) {
            if (code !== this.content_src.charCodeAt(pos)) return pos;
          }
          break;
        case "object":
          for (; pos > min; pos--) {
            if (code.indexOf(this.content_src.charCodeAt(pos)) < 0) return pos;
          }
          break;
      }
    }
    return -1;
  }

  /** 获取从位置 `pos` 开始，逆向第一个 `skip_when` 判定为 `false` 的字符的位置
   * @param skip_when 判断 `cur_code` 为要跳过的字符时应返回 `true`，否则应返回 `false`。
   * @param min 最小查找位置 - 1
   * @returns 跳转到的位置，若跳转失败则为 `-1`
   */
  skip_back_with(pos: number, skip_when: ((cur_code: number) => boolean), min = -1) {
    if (pos < this.cs_len) {
      for (; pos > min; pos--) {
        if (!skip_when(this.content_src.charCodeAt(pos))) return pos;
      }
    }
    return -1;
  }

  /** 获取从位置 `pos` 开始，第一个被 `is_space` 判定为 `false` 的字符的位置
   * @param max 最大查找位置 + 1
   * @returns 跳转到的位置，若跳转失败则为 `-1`
   */
  skip_space(pos: number, max?: number) {
    return this.skip_with(pos, is_space, max)
  }

  /** 获取从位置 `pos` 开始，逆向第一个被 `is_space` 判定为 `false` 的字符的位置
   * @param max 最小查找位置 - 1
   * @returns 跳转到的位置，若跳转失败则为 `-1`
   */
  skip_space_back(pos: number, max?: number) {
    return this.skip_back_with(pos, is_space, max)
  }

  /**
   * 获取指定行之间的内容。默认会拼合缩进。
   * @param begin 开始行
   * @param end 结束行（不含）
   * @param option.indent_offset 缩进层级偏移
   */
  get_lines(begin: number, end: number, option?: {
    /** 给外层附加上的缩进数。 */
    outermost_indent?: number
    /** 缩进信息 */
    indent_info?: IndentInfo
    /** 保留最后一行的换行符 */
    keep_last_LF?: boolean
    /** 内容的缩进层级偏移，偏移到小于0则为0 */
    indent_offset?: number
    /** 禁用原有的缩进。 */
    no_original_indent?: boolean
  }) {
    /** 当前行 */
    let line = begin;
    if (begin >= end) return '';

    let result_arr: string[] = [];
    let first_line_indent = this.indent_count[begin]

    const _option = {
      outermost_indent: 0,
      keep_last_LF: false,
      indent_offset: 0,
      no_original_indent: false,
      ...option
    }

    const indent_info = {
      mode: IndentMode.Space,
      size: 4,
      ..._option.indent_info
    }

    for (let i = begin; i < end; i++) {
      const res_index = i - begin;
      let line_indent = _option.no_original_indent ? 0
        : this.indent_count[line];

      result_arr[res_index] = this.cs_arr[i]

      /** 当前行的相对缩进等级 */
      let relative_indent = line_indent - first_line_indent + _option.indent_offset
      if (relative_indent < 0) { relative_indent = 0 } // 防止影响到 option.outermost_indent

      /** 最终的的缩进等级 */
      let result_indent = _option.outermost_indent + relative_indent

      if (indent_info.mode === IndentMode.Space) {
        result_arr[res_index] = " ".repeat(indent_info.size * result_indent) + result_arr[res_index]
      } else {
        result_arr[res_index] = "\t".repeat(result_indent) + result_arr[res_index]
      }

      if (i + 1 === this.cs_arr.length && _option.keep_last_LF) {
        result_arr[res_index] += "\n";
      }
    }
    return result_arr.join("\n")
  }

  revert() {
    const stack = this.props_history_stack
    const last_index = stack.length - 1
    const is_last = last_index !== 0

    let props: Optional<BlockStateProps>
    if (!is_last) { props = stack.pop()! }
    else { props = stack[last_index] }

    Object.entries(props).forEach(([name, value]) => {
      // @ts-ignore
      this[name] = value
    })

    if (is_last) { stack[0] = {} }
  }

  push_props() {
    this.props_history_stack.push({})
  }

  set_props(options: Optional<BlockStateProps>) {
    const stack = this.props_history_stack
    const last_index = stack.length - 1
    const old: Optional<BlockStateProps> = stack[last_index]
    Object.entries(options).forEach(([name, value]) => {
      // @ts-ignore
      old[name] = this[name]
      // @ts-ignore
      this[name] = value
    })
  }

  find_terminators(terminators: BlockRuleProcessor[], start_line: number, end_line: number) {
    let terminator: BlockRuleProcessor | undefined;
    for (let i = 0; i < terminators.length; i++) {
      if (terminators[i](this, start_line, end_line, true)) {
        terminator = terminators[i];
        break;
      }
    }
    return terminator
  }
}