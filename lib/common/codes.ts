import { P } from "uc.micro";

export default {
  /** null `"\0"` */
  NUL: 0x00 as const,
  /** `"\t"` */
  HT: 0x09 as const,
  /** `"\n"` */
  LF: 0x0A as const,
  /** `" "` */
  Space: 0x20 as const,
  /** `"!"` */
  Exclamatory: 0x21 as const,
  /** `"` */
  DoubleQuotation: 0x22 as const,
  /** `"#"` */
  NumberSign: 0x23 as const,
  /** `"$"` */
  DollarSign: 0x24 as const,
  /** `"%"` */
  PercentSign: 0x25 as const,
  /** `"&"` */
  Ampersand: 0x26 as const,
  /** `"'"` */
  Apostrophe: 0x27 as const,
  /** `"("` */
  LeftParentheses: 0x28 as const,
  /** `")"` */
  RightParentheses: 0x29 as const,
  /** `"*"` */
  Asterisk: 0x2A as const,
  /** `"+"` */
  PlusSign: 0x2B as const,
  /** `","` */
  Comma: 0x2C as const,
  /** `"-"` */
  MinusSign: 0x2D as const,
  /** `"."` */
  Dot: 0x2E as const,
  /** `"/"` */
  Slash: 0x2F as const,
  /** `":"` */
  Colon: 0x3A as const,
  /** `","` */
  Semicolon: 0x3B as const,
  /** `"\"` */
  Backslash: 0x5c as const,
  /** ``"`"`` */
  Backtick: 0x60 as const
}

/** 见规范 **Unicode 空白字符** */
export function is_white_space(code: number) {
  if (code >= 0x2000 && code <= 0x200A) { return true; }
  switch (code) {
    case 0x09: // \t
    case 0x0A: // \n
    case 0x0B: // \v
    case 0x0C: // \f
    case 0x0D: // \r
    case 0x20: //  
    case 0xA0: // nbsp
    case 0x1680:
    case 0x202F:
    case 0x205F:
    case 0x3000:
      return true;
  }
  return false;
}

/** 字符是否为 unicode P（符号） 类的字符 */
export function is_punct_char(ch: string) {
  return P.test(ch);
}

export function is_ascii_punct_char(ch: string) {
  const re = /[\\!"#$%&'()*+,.\/:;<=>?@[\]^_`{|}~-]/
  return re.test(ch);
}