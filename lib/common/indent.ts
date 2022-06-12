export enum IndentMode {
  /** 水平制表符缩进模式。indent_size 只能是 1 */
  HT,
  /** 空格缩进模式。 */
  Space,
  /** 未知。 */
  Unknown
}

/** 代表一个缩进单元的空格数量 */
export type IndentSize = 1 | 2 | 4 | 8

export interface IndentInfo {
  mode: IndentMode
  size: IndentSize
}

/** 假以 `indent_src` 作为缩进单元，匹配最适合 `indent_src` 的缩进模式与缩进长度， */
export function match_indent_mode (indent_src: string) {
  const pure_space_RE = /^ *$/
  const pure_tab_RE = /^\t*$/

  let mode: IndentMode

  // 多数人使用的空格缩进模式
  if (pure_space_RE.test(indent_src)) {
    mode = IndentMode.Space
    let space_num = indent_src.length;
    let size: IndentSize = 1
    // 往大的匹配，超过最大的就返回最大的
    for (let exponent = 0; exponent < 4; exponent++) {
      let power = 2 ** exponent;
      if (power > space_num) break;
      else size = power as IndentSize;
    }
    return {
      mode, size
    }
  }
  // 水平制表符缩进模式
  else if (pure_tab_RE.test(indent_src)) {
    mode = IndentMode.HT
    return { mode }
  }
  // 不支持缩进模式混用
  else {
    throw new Error(
      `Indent mode mixed with spaces and horizontal tabs is not supported.`
    );
  }
}

/** 计算缩进源码的缩进数。 */
export function count_indent(src: string, info: IndentInfo) {
  let indent_num: number
  // 空格缩进模式
  if (info.mode === IndentMode.Space)
    indent_num = Math.floor(src.length / info.size);
  // 水平制表符缩进模式
  else if (info.mode === IndentMode.HT)
    indent_num = src.length;
  else throw new Error("Unsupported IndentMode");
  return indent_num
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