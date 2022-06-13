import is_space from "./is_space"

export enum IndentMode {
  /** 水平制表符缩进模式。indent_size 只能是 1 */
  HT,
  /** 空格缩进模式。 */
  Space,
  /** 未知。 */
  Unknown
}

/** 代表一个缩进单元的空格数量 */
export type IndentSize = number

export interface IndentInfo {
  mode: IndentMode
  size: IndentSize
}

/** 假以 `indent_src` 作为缩进单元，匹配最适合 `indent_src` 的缩进模式与缩进长度， */
export function match_indent_mode(line_content: string) {
  let mode: IndentMode
  const first_code = line_content.charCodeAt(0)
  const len = line_content.length

  if (first_code === 0x20 /* \n */) {
    mode = IndentMode.Space
  } else if (first_code === 0x09 /* \t */) {
    mode = IndentMode.HT
  } else {
    return false
  }

  let pos = 1
  for (; pos < len; pos++) {
    const ch = line_content.charCodeAt(pos)
    if (ch !== first_code) {
      break
    }
  }

  // 空行不匹配
  if (pos + 1 === len) {
    return false
  }

  let size: IndentSize = 1
  for (let exponent = 0; exponent < 4; exponent++) {
    let power = 2 ** exponent;
    if (power > pos) break;
    else size = power as IndentSize;
  }

  return {
    mode, size
  }
}

/** 计算源码行的缩进字符数。 */
export function count_indent_ch(line_content: string, info: IndentInfo) {

  const first_code = line_content.charCodeAt(0)
  const len = line_content.length

  if (first_code !== 0x20 /* \n */ && first_code !== 0x09 /* \t */) {
    return 0
  }

  let pos = 1
  for (; pos < len; pos++) {
    const ch = line_content.charCodeAt(pos)
    if (ch !== first_code) {
      break
    }
  }

  // 空行不计缩进
  if (pos + 1 === len) {
    return 0
  }

  let indent_num: number
  // 空格缩进模式
  if (info.mode === IndentMode.Unknown)
    throw new Error("Unsupported IndentMode")
  else indent_num = pos;
  return indent_num
}

export function to_indent_size(indent_ch_num: number) {
  let size: IndentSize = 1
  for (let exponent = 0; exponent < 4; exponent++) {
    let power = 2 ** exponent;
    if (power > indent_ch_num) break;
    else size = power as IndentSize;
  }
  return size
}

/** 按照缩进格式分割缩进。
 * @returns 缩进分割结果。
 */
export function split_indent(src: string, num: number, info: IndentInfo): [indent: string, others: string] {
  let re_src: string
  if (info.mode === IndentMode.Space) {
    re_src = `^[ ]{${info.size * num}}`
  } else if (info.mode === IndentMode.HT) {
    re_src = `^[\t]{${info.size * num}}`
  } else {
    return ["", src]
  };

  const re = new RegExp(re_src)
  const match = src.match(re)
  if (match) {
    return [src.slice(0, match[0].length), src.slice(match[0].length)]
  }
  return ["", src]
}