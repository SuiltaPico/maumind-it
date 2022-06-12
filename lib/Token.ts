export enum Nesting {
  Closing,
  SelfClosing,
  Opening
}

export default class Token {
  /** Token 的类型，例如 "paragraph_open"。 */
  type: string | "inline"

  /** HTML 标签名。 */
  tag: string

  /** HTML attributes。*/
  // 更改记录：
  // attribute 没有顺序需求，因此这里改用 Map
  // markdown-it 的设计使用了二维数组，虽然空间占用少，但遇到多 attrs 时，对 attrs 的许多操作时间复杂度代价会达到 O(n)
  // 经过测试，Map 应对小规模数据性能会略低于 Array（Array 快 1.6 倍），但 API 用的舒服 :)
  // 当然，为了 API 写的舒服而放弃性能是不行的，于是又把 Map 换成了 {} ，性能基本持平（Array 小数据仍然快 1.04 倍，不过这并不是什么大问题）
  attrs: { [key: string]: string } = {};

  /** 源映射信息。 */
  map?: [line_begin: number, line_end: number];

  /** 等级改变符
   * - `1` 表示标签打开了
   * - `0` 表示标签是自动关闭的
   * - `-1` 表示标签正在关闭
   */
  nesting: Nesting

  /** 嵌套级别，和 `state.level` 的一样。 */
  level = 0

  /** 子节点数组（内联和 img token） */
  children?: Token[]

  /** 内容。
   * 如果是自动关闭标签（代码、html、围栏等），则它有内容。
   */
  content: string = ""

  /** 标记
   * 如，用 "*" 或 "_" 表示强调，用 ``` 表示围栏等。
   */
  markup?: string

  /** 其他信息。
   * 可能是：
   * - 围栏信息字符串
   * - 自动链接 `"link_open"` 和 `"link_close"` 标记的值 `"auto"`
   * - 有序列表 `"list_item_open"` 标记的项标记的字符串值
   */
  info?: string

  /** 插件用来存储任意数据的地方 */
  meta?: any

  /** 是否为块级标记。
   * 对于块级标记为 `true`，对于内联标记为 `false`。
   * 在渲染器中用于计算换行符。
   */
  block = false

  /** 是否隐藏标签。
   * 如果为 `true`，则在渲染时忽略此元素。用于隐藏段落的紧凑列表。
   */
  hidden = false

  within_name?: string

  section_level?: number

  constructor(type: string, tag: string, nesting: Nesting) {
    this.type = type
    this.tag = tag
    this.nesting = nesting
  }

  /** 设置 Token 渲染到元素附带的 attribute，若 attribute 已存在则会覆盖之前的值。
   * @param name attribute 名
   * @param value attribute 值，或一个接收为上一个值为参数，生成值的函数。
   */
  set_attr(name: string, value: string | ((prev: string | undefined) => string)) {
    switch (typeof value) {
      case "string":
        this.attrs[name] = value; break;
      case "function":
        this.attrs[name] = value(this.attrs[name]); break;
      default: break;
    }
  }

  push_class(class_name: string) {
    this.set_attr("class", p => p ? p + " " : "" + class_name)
  }

  /** 获取名为 `name` 的 attribute 的值
   * @param name attribute 名
   */
  get_attr(name: string) {
    return this.attrs[name]
  }

  get_attr_len() {
    return Object.getOwnPropertyNames(this.attrs).length
  }

  remove_attr(name: string) {
    delete this.attrs[name]
  }

  join_attr(name: string, value: string, separator = " ") {
    let prev = this.attrs[name]
    this.attrs[name] = prev ? prev + separator + value : value
  }
}
