import State from "./State";
import MaudownIt from "..";

export default class CoreState extends State {
  /** inlineMode 表示解析的时候是否编译成 type 为 inline 的 token。 */
  inline_mode = false

  constructor(src: string, md: MaudownIt, env?: object) {
    super(src, md, env)
  }
}

