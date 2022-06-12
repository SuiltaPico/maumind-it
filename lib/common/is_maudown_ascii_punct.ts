/** 判断字符是否为 ASCII 标点字符。
 * 
 * 见规范 **ASCII 标点字符** */
export default function is_maudown_ascii_punct(ch: number) {
  if (
    (ch >= 0x21 && ch <= 0x2F)
    || (ch >= 0x3A && ch <= 0x40)
    || (ch >= 0x5B && ch <= 0x60)
    || (ch >= 0x7B && ch <= 0x7E)
  ) { return true }
  return false;
}