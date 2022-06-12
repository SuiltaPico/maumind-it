export enum RegexFlag {
    /** 全局匹配，在匹配到第一个匹配项后不返回 */
    Global = "g",
    /** 多行匹配 */
    MultiLine = "m",
    /** 不区分大小写 */
    Insensitive = "i",
    /** 忽略正则表达式中的空白且允许注释 */
    Extended = "x",
    /** 单行匹配，不匹配新行 */
    SingleLine = "s",
    /** 使用 Unicode 标志时，有效所有字符表示包含所有代码点值的 CharSet；否则有效的所有字符表示包含所有代码单元值的 CharSet。 */
    Unicode = "u",
    /** 不贪婪，会使匹配变得惰性。例如，原本的 `+` 会尽可能匹配最多个，开启了之后会尽可能仅匹配一个 */
    Ungreedy = "U",
    /** 锚定。模式会被强制锚定在搜索开始的位置，或者在最后一次成功匹配的位置，相当于 `\G` */
    Anchored = "A",
    /** 允许重复的子模式名 */
    Changed = "J",
    /** 强制美元符号 `$` 始终匹配字符串的结尾，而不是行尾。如果设置了 `m` 标志，则忽略此选项 */
    DollarEndOnly = "D"
}

export function build(re: string, flag?: RegexFlag[]) {
    return new RegExp(re, flag?.join(""))
}

export function connect(...res: string[]) {
    return res.join("")
}

export function non_capturing_group(...res: string[]) {
    return `(?:${res.join("|")})`
}

export function named_capturing_group(name: string, ...res: string[]) {
    return `(?<${name}>${res.join("|")})`
}

export function capturing_group(...res: string[]) {
    return `(${res.join("|")})`
}

let R = String.raw

export { R }