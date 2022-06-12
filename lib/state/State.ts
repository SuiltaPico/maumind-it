import MaudownIt from "..";
import Token from "../Token";

export default class State {
  tokens: Token[] = []
  /** 源代码
   */
  src: string
  env: any
  md: MaudownIt
  global_meta: {
    [key: string]: any
  } = {}
  constructor(src: string, md: MaudownIt, env: any) {
    this.src = src;
    this.env = env;
    this.md = md; // link to parser instance
  }
}