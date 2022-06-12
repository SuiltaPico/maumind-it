import MaudownIt from "..";
import { is_punct_char, is_white_space } from "../common/codes";
import is_maudown_ascii_punct from "../common/is_maudown_ascii_punct";
import is_space from "../common/is_space";
import Token, { Nesting } from "../Token";
import State from "./State";

export type Delimiter = {
  /** 起始标记的字符码。 */
  marker: number
  /** 这些分隔符系列的总长度。  */
  length: number
  /** 分隔符对应的 token 的索引。 */
  token_index: number
  /** 如果分隔符被匹配为一个有效的开始符，`end` 将等于它的位置，否则它是 `-1`。 */
  end: number
  /** 分隔符是否可以打开 */
  open: boolean
  /** 分隔符是否可以关闭 */
  close: boolean,
  /** 分隔符是否两边连接着单词 */
  near_word: boolean
}

export default class InlineState extends State {
  tokens_meta: any[] = []
  /** `src` 字符索引。 */
  pos = 0
  src_len: number
  level = 0
  /** 待处理文本 */
  pending = ""
  pending_level = 0
  /** 存储 { start: end } 对。对于对解析的回溯优化（强调，罢工）很有用。 */
  cache: number[] = []
  /** 当前标签的类似强调的分隔符列表 */
  delimiters: Delimiter[] = []
  /** 上层标签的分隔符列表堆栈 */
  _prev_delimiters: (any[] | undefined)[] = []
  /** 反引号长度 => 最后看到的位置 */
  backticks: { [key: number]: number } = {}
  backticks_scanned = false

  constructor(src: string, md: MaudownIt, env: any, out_tokens: Token[]) {
    super(src, md, env)
    this.src_len = src.length
    this.tokens = out_tokens
  }

  /** 将待处理文本 `pending` 生成一个 `text` token 。 */
  push_pending() {
    const token = new Token('text', '', Nesting.SelfClosing);
    token.content = this.pending;
    token.level = this.pending_level;
    this.tokens.push(token);
    this.pending = '';
    //return token;
  }

  /** 将新 token 推送到流。 
   * 
   * 如果存在待处理文本 - 将其刷新为文本标记。
  */
  push(type: string, tag: string, nesting: Nesting) {
    if (this.pending) {
      this.push_pending();
    }

    let token = new Token(type, tag, nesting);
    let token_meta: any = null;

    if (nesting === Nesting.Closing) {
      this.level--;
      this.delimiters = this._prev_delimiters.pop()!;
    }

    token.level = this.level;

    if (nesting === Nesting.Opening) {
      this.level++;
      this._prev_delimiters.push(this.delimiters);
      this.delimiters = [];
      token_meta = { delimiters: this.delimiters };
    }

    this.pending_level = this.level;
    this.tokens.push(token);
    this.tokens_meta.push(token_meta);

    /*if (this.tokens_meta.length > 0) {
      console.log(this.tokens_meta);
    }*/
    return token;
  }

  /**
   * 扫描一系列与 `start` 相同字符的标记，并确定它是可以作为开始与结束 token。
   *
   * @param start 扫描起始位置；
   * @param can_split_word 标记是否可以分割单词
   */
  scan_delimiters(start: number, can_split_word: boolean) {
    let pos = start
    const max = this.src_len
    const marker = this.src.charCodeAt(start);

    /** `start` 的前一个字符。如果在行头则视为空白 */
    const last_char = start > 0 ? this.src.charCodeAt(start - 1) : 0x20;

    // 让 pos 指向标记的最后一个字符位置 + 1
    while (pos < max && this.src.charCodeAt(pos) === marker) { pos++; }

    /** 标记的长度 */
    const count = pos - start;

    /** 标记末的后一个字符。如果标记末后是源码末尾，则视为空白 */
    const next_char = pos < max ? this.src.charCodeAt(pos) : 0x20;

    const is_last_punct_char = is_maudown_ascii_punct(last_char) || is_punct_char(String.fromCharCode(last_char));
    const is_next_punct_char = is_maudown_ascii_punct(next_char) || is_punct_char(String.fromCharCode(next_char));

    const is_last_white_space = is_white_space(last_char);
    const is_next_white_space = is_white_space(next_char);

    /** 标记可能是左翼 */
    let left_flanking = true
    let right_flanking = true

    // 如果标记末尾是空白字符，则不是左翼
    // 如果标记末尾是符号字符，并且标记前字符不为空白或符号，则不是左翼
    if (is_next_white_space) {
      left_flanking = false;
    } else if (is_next_punct_char) {
      if (!(is_last_white_space || is_last_punct_char)) {
        left_flanking = false;
      }
    }

    if (is_last_white_space) {
      right_flanking = false;
    } else if (is_last_punct_char) {
      if (!(is_next_white_space || is_next_punct_char)) {
        right_flanking = false;
      }
    }

    let can_open, can_close

    if (!can_split_word) {
      // 可能是左翼且不是右翼关或标记前为符号字符 _**0
      can_open = left_flanking && (!right_flanking || is_last_punct_char);
      can_close = right_flanking && (!left_flanking || is_next_punct_char);
    } else {
      can_open = left_flanking;
      can_close = right_flanking;
    }

    return {
      /** 标记是否可以作为开始标记 */
      can_open,
      /** 标记是否可以作为结束标记 */
      can_close,
      /** 标记长度 */
      length: count,
      near_word: (
        !(is_last_white_space || is_last_punct_char)
        && !(is_next_white_space || is_next_punct_char)
      )
    };
  }

  process_pair_delimiter(
    delimiters: Delimiter[],
    processor: (start_delimiter: Delimiter, end_delimiter: Delimiter, start_index: number) => number,
    validator: (delimiter: Delimiter) => boolean
  ) {
    for (let i = delimiters.length - 1; i >= 0; i--) {
      const start_delimiter = delimiters[i];
      const end_delimiter_index = start_delimiter.end

      if (!validator(start_delimiter)) {
        continue;
      }

      const end_delimiter = delimiters[end_delimiter_index];
      i -= processor(start_delimiter, end_delimiter, i)
    }
  }

  set_pair_delimiter_token(
    open_token: Token,
    close_token: Token,
    options: { [P in keyof Token]?: Token[P] }
  ) {
    open_token.nesting = Nesting.Opening;
    close_token.nesting = Nesting.Closing;
    Object.entries(options).forEach(([key, value]) => {
      if (key === "type") {
        open_token.type = value + "_open";
        close_token.type = value + "_close";
      } else {
        // @ts-ignore
        open_token[key] = value
        // @ts-ignore
        close_token[key] = value
      }
    })
  }

  /** 跳过空白，至 `max` 前一个字符 */
  skip_space(max = this.src_len) {
    let pos = this.pos
    while (pos < max && is_space(this.src.charCodeAt(pos))) { pos++; }
  }

  count_same_char(pos: number, max: number, char: number) {
    while (pos < max && this.src.charCodeAt(pos) === char) { pos++; }
    return max - pos;
  }
}