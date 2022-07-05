import Token, { Nesting } from "../Token";
import is_space from "../common/is_space"
import MaudownIt, { MaudownItEnv } from "..";
import State from "./State";
import {
  count_indent_ch, IndentInfo, IndentMode,
  IndentSize, match_indent_mode, split_indent, to_indent_size
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

  section_infos: [name: string, level: number, relative_level?: number][] = []

  rr_indexes: number[] = []

  prefix_stack: string[] = []

  props_history_stack: Optional<BlockStateProps>[] = [{}]

  block_indent: number = 0;

  constructor(src: string, md: MaudownIt, env: MaudownItEnv, tokens: Token[]) {
    super(src, md, env)
    console.time("block_state_init")
    this.tokens = tokens;


    let indent_info: IndentInfo = {
      mode: env.indent_info.mode,
      size: env.indent_info.size
    }

    const src_arr = src.split("\n")
    const indent_count: number[] = (Array(src_arr.length) as number[]).fill(0, 0, src_arr.length)
    const start_pos: number[] = []
    const src_arr_len = src_arr.length

    let last_start_pos = 0
    for (let i = 0; i < src_arr.length; i++) {
      const line_content = src_arr[i];
      start_pos.push(last_start_pos)
      last_start_pos += line_content.length
    }

    // 如果未确定缩进模式，先扫描

    let scan_pointer = 0
    if (indent_info.mode === IndentMode.Unknown) {
      for (; scan_pointer < src_arr_len; scan_pointer++) {
        const match_res = match_indent_mode(src_arr[scan_pointer])
        if (match_res) {
          indent_info = match_res
          env.indent_info = indent_info
          break
        }
      }
    }

    // 扫描缩进
    for (; scan_pointer < src_arr_len; scan_pointer++) {
      indent_count[scan_pointer] = count_indent_ch(src_arr[scan_pointer], indent_info)
    }

    // 内容保护块里可能包含注释代码，注释里也可能包含内容保护块的代码
    // 缩进如果没有预设，应该从是非内容保护块非注释的第一行代码获取。

    // 内容保护块前面不能有字符。注释前面可以有任意字符。

    /** 需要检测的正则，由于 ECMA 正则会吞字符的问题，需要独立匹配缩进。 */
    const RegExps = {
      /** 注释开始。匹配组：
       * 1. 边界标识 */
      comments_start: /([\-]*)\/\*/,
      /** 注释结束。匹配组：
       * 1. 边界标识 */
      comments_end: /\*\/([\-]*)/,
      /** 扩展块开始。匹配组：
       * 1. 边界标识
       * 2. 扩展块头 */
      exblock_start: /([\-]*)\/(?:[^{]+|\{[^{]+)\{{2}/,
      /** 扩展块结束。匹配组：
       * 1. 边界标识 */
      exblock_end: /\}{2}\/([\-]*)$/,
      /** 围栏块开始。匹配组：
       * 1. 边界标识 */
      fcblock_start: /([\-]*)\`{3}/,
      /** 围栏块结束。匹配组：
       * 1. 边界标识 */
      fcblock_end: /\`{3}([\-]*)$/,
    } as const

    // 将 `RegExps` 合并成一个具名正则表达式，并全局多行匹配

    let re_src_arr: string[] = []
    Object.entries(RegExps).forEach(([name, re]) => {
      re_src_arr.push(`(?<${name}>` + re.source + ")")
    })
    const RE = new RegExp(re_src_arr.join("|"), "gm")
    let match_result = [...src.matchAll(RE)]

    // 收集要寻找的标记信息，每行第一个是 indent_src

    type MarkInfo = {
      type: keyof typeof RegExps | "indent_src",
      bdi: number
      start_line: number
      end_line: number
      start: number
    }
    const marks: MarkInfo[] = []

    //console.log("re", RE)

    let next_start_pos = -1
    let line_index = 0

    match_result.forEach(r => {
      const index = r.index!
      for (line_index; index < next_start_pos && line_index < src_arr_len; line_index++) {
        next_start_pos = start_pos[line_index];
      }
      const start_line = line_index
      for (line_index; index + r[0].length < next_start_pos && line_index < src_arr_len; line_index++) {
        next_start_pos = start_pos[line_index];
      }

      let available_bdi = 0

      for (let i = 1; i < 6; i++) {
        const len = r[i]?.length
        if (len !== 0) { available_bdi = len }
      }

      marks.push({
        type: get_available_key(r.groups!) as keyof typeof RegExps,
        start_line: start_line,
        end_line: line_index,
        start: index,
        bdi: r[1]?.length ?? 0
      })
    });

    // 识别内容保护块、注释、缩进

    type BlockType = "" | "comments" | "fc" | "ex"
    type StateBlockType = Exclude<BlockType, "indent">

    const inner_state = {
      bd_ident_num: 0,
      block_indent: 0,
      block_type: "" as StateBlockType,
      block_start_line: -1,
    }

    type BlockInfo = {
      type: BlockType,
      /** 片段的起始行 */
      start_line: number,
      /** 片段的结束行 */
      end_line: number,
      indent: number
    }
    /** 包含以下 `src` 段的信息：
     * * `indent`：maudown 的有效缩进信息。注释和内容保护块的内容不计。
     * * `comments`：注释
     * * `fc`：围栏块
     * * `ex`：扩展块
     */
    const block_infos: BlockInfo[] = []

    function push_to_block_infos(type: Exclude<BlockType, "">, end_line: number, start_line?: number) {
      return block_infos.push({
        type,
        start_line: start_line === undefined ? inner_state.block_start_line : start_line,
        end_line: end_line,
        indent: inner_state.block_indent
      })
    }

    /** 当前 block_type 为 indent */
    function not_in_block() {
      return !inner_state.block_type
    }

    /** 当前 mask 是否位于行起始。忽略缩进。
     */
    function is_at_line_begin(mark: MarkInfo) {
      const indent = indent_count[mark.start_line]
      return start_pos[mark.start_line] + indent * indent_info.size === mark.start;
    }

    function cpblock_start(block_type: Exclude<StateBlockType, "">, m: MarkInfo) {
      if (is_at_line_begin(m) && not_in_block()) {
        inner_state.block_type = block_type
        inner_state.bd_ident_num = m.bdi
        inner_state.block_start_line = m.start
        inner_state.block_indent = indent_count[m.start_line]
      }
    }

    function cpblock_end(block_type: Exclude<StateBlockType, "">, m: MarkInfo) {
      if (inner_state.block_type === block_type
        && m.bdi === inner_state.bd_ident_num
        && indent_count[m.start_line] === inner_state.block_indent
      ) {
        push_to_block_infos(block_type, m.end_line)
        inner_state.block_type = ""
      }
    }

    // 扩展该 switch 的注意事项：
    // 1. `_start` 修改的元素必须与 `_end` 读取的元素能对的上
    // 2. `_end` 结束必须执行 state.block_type = ""
    marks.forEach((m) => {
      switch (m.type) {
        case "comments_start":
          cpblock_start("comments", m)
          break
        case "comments_end":
          cpblock_end("comments", m)
          break
        case "exblock_start":
          cpblock_start("ex", m)
          break
        case "exblock_end":
          cpblock_end("ex", m)
          break
        case "fcblock_start":
          cpblock_start("fc", m)
          break
        case "fcblock_end":
          cpblock_end("fc", m)
          break
        default:
          throw new Error(`The ${m.type} type of processing scheme is not defined`);
      }
    })

    for (let i = 0; i < block_infos.length; i++) {
      const bi = block_infos[i];
      if (bi.start_line + 1 < bi.end_line) {
        for (let line_index = bi.start_line + 1; line_index < bi.end_line; line_index++) {
          start_pos[line_index] = bi.indent
        }
      }
    }

    for (let i = 0; i < src_arr_len; i++) {
      src_arr[i] = src_arr[i].slice(indent_count[i]);
    }

    if (indent_info.size !== 0) {
      for (let i = 0; i < src_arr_len; i++) {
        indent_count[i] = Math.floor(indent_count[i] / indent_info.size)
      }
    }

    this.cs_arr = src_arr
    this.indent_count = indent_count
    this.line_count = src_arr_len

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
  // skip_chars(pos: number, code: number | number[], max = this.cs_len) {
  //   if (pos > 0) {
  //     switch (typeof code) {
  //       case "number":
  //         for (; pos < max; pos++) {
  //           if (code !== this.content_src.charCodeAt(pos)) return pos;
  //         }
  //         break;
  //       case "object":
  //         for (; pos < max; pos++) {
  //           let ch = this.content_src.charCodeAt(pos);
  //           if (code.indexOf(ch) < 0) return pos;
  //         }
  //         break;
  //     }
  //   }
  //   return -1;
  // };

  /** 获取从位置 `pos` 开始，第一个 `skip_when` 判定为 `false` 的字符的位置
   * @param skip_when 判断 `cur_code` 为要跳过的字符时应返回 `true`，否则应返回 `false`。
   * @param max 最大查找位置 + 1
   * @returns 跳转到的位置，若跳转失败则为 `-1`
   */
  // skip_with(pos: number, skip_when: ((cur_code: number) => boolean), max = this.cs_len) {
  //   if (pos > 0) {
  //     for (; pos < max; pos++) {
  //       if (!skip_when(this.content_src.charCodeAt(pos))) return pos;
  //     }
  //   }
  //   return -1;
  // }

  /** 获取从位置 `pos` 开始，逆向第一个不等于 `code` 的字符的位置
   * @param code 要跳过的字符码或数组。
   * @param min 最小查找位置 - 1
   * @returns 跳转到的位置，若跳转失败则为 `-1`
   */
  // skip_chars_back(pos: number, code: number | number[], min = -1) {
  //   if (pos < this.cs_len) {
  //     switch (typeof code) {
  //       case "number":
  //         for (; pos > min; pos--) {
  //           if (code !== this.content_src.charCodeAt(pos)) return pos;
  //         }
  //         break;
  //       case "object":
  //         for (; pos > min; pos--) {
  //           if (code.indexOf(this.content_src.charCodeAt(pos)) < 0) return pos;
  //         }
  //         break;
  //     }
  //   }
  //   return -1;
  // }

  /** 获取从位置 `pos` 开始，逆向第一个 `skip_when` 判定为 `false` 的字符的位置
   * @param skip_when 判断 `cur_code` 为要跳过的字符时应返回 `true`，否则应返回 `false`。
   * @param min 最小查找位置 - 1
   * @returns 跳转到的位置，若跳转失败则为 `-1`
   */
  // skip_back_with(pos: number, skip_when: ((cur_code: number) => boolean), min = -1) {
  //   if (pos < this.cs_len) {
  //     for (; pos > min; pos--) {
  //       if (!skip_when(this.content_src.charCodeAt(pos))) return pos;
  //     }
  //   }
  //   return -1;
  // }

  /** 获取从位置 `pos` 开始，第一个被 `is_space` 判定为 `false` 的字符的位置
   * @param max 最大查找位置 + 1
   * @returns 跳转到的位置，若跳转失败则为 `-1`
   */
  // skip_space(pos: number, max?: number) {
  //   return this.skip_with(pos, is_space, max)
  // }

  /** 获取从位置 `pos` 开始，逆向第一个被 `is_space` 判定为 `false` 的字符的位置
   * @param max 最小查找位置 - 1
   * @returns 跳转到的位置，若跳转失败则为 `-1`
   */
  // skip_space_back(pos: number, max?: number) {
  //   return this.skip_back_with(pos, is_space, max)
  // }

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