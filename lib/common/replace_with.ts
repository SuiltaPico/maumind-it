/** 替换 `matcher` 匹配到的字符串，允许通过获取当前匹配的字符串给出新的字符串
 * @param target 要被执行替换操作的目标字符串
 * @param matcher 匹配器或返回匹配器的函数
 * @param replacement 一个返回要替换成的文本的函数，返回空代表不作处理
 */
export default function (target: string, matcher: RegExp | (() => RegExp), replacement: (match_arr: RegExpMatchArray, index: number) => string | void) {
    let match_res: RegExpMatchArray[]
    if (typeof matcher == "object") match_res = [...target.matchAll(matcher)]
    else match_res = [...target.matchAll(matcher())]

    let offset = 0
    let index = 0
    for (const match_arr of match_res) {
        let new_str = replacement(match_arr, index)
        if (new_str === undefined) continue;
        target = target.slice(0, match_arr.index! + offset) + new_str + target.slice(match_arr.index! + match_arr[0].length + offset)
        offset += (new_str.length - match_arr[0].length)
        index += 1
    }
    return target
}