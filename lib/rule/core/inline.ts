import { CoreRuleProcessor } from "../../parser/ParserCore";
import CoreState from "../../state/CoreState";

/** 调用 `ParserInline` 处理所有 inline token，解析 token 的内容并生成新的 token 到其 `children` 属性上。
 * @param state
 */

const inline: CoreRuleProcessor = (state) => {
  let tokens = state.tokens;

  for (let i = 0, l = tokens.length; i < l; i++) {
    let token = tokens[i];
    if (token.type === "inline") {
      state.md.inline.parse(token.content, state.md, state.env, token.children!);
    }
  }
};

export default inline
