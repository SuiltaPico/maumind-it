/** 
 * @param pairs `to` 为最后一个字符所在的位置
*/
export default function string_trim_clip(str: string, pairs: [from: number, to: number][]) {
  let result = ""
  let _from = 0
  for (let i = 0; i < pairs.length; i++) {
    const [from, to] = pairs[i]
    result += str.slice(_from, from)
    _from = to + 1
  }
  result += str.slice(_from)
  return result
}

// s|ab|s|d|f