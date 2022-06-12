import Token, { Nesting } from "../../Token";
import CoreState from "../../state/CoreState";

/** 调用 `ParserBlock` 把 `state.src` 解析成一个个 inline token，但不对其内容 `content` 进行处理，
 * @param state
 */
export default function (state: CoreState) {
  // 如果是 inline 模式，则直接把所有内容解析为 inline token
  if (state.inline_mode) {
    let token = new Token('inline', '', Nesting.SelfClosing);
    token.content = state.src;
    token.map = [0, 1];
    token.children = [];
    state.tokens.push(token);
  }
  // 否则使用 block 解析器解析
  else {
    state.md.block.parse(state.src, state.md, state.env, state.tokens);
  }
  //console.log("after block", JSON.parse(JSON.stringify(state.tokens)));
};
