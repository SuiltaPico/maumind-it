export function match_from(str: string, re: RegExp, index = 0, to = str.length - 1) {
  let result = str.slice(index, to + 1).match(re)
  if (result && result.index !== undefined) {
    result.index += index
  }
  return result
}