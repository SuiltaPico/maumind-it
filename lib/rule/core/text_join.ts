/** 将原始文本标记与其余文本连接起来。
 * 
 * 这是作为一个单独的规则设置的，
 * 以提供插件在文本连接之后但在转义连接之前运行文本替换的机会。
 * 例如，`\:)`不应替换为表情符号。
 */

import { CoreRuleProcessor } from "../../parser/ParserCore";

const text_join: CoreRuleProcessor = (state) => {
  const block_tokens = state.tokens;

  for (let j = 0; j < block_tokens.length; j++) {
    if (block_tokens[j].type !== 'inline') continue;

    const tokens = block_tokens[j].children!;
    const max = tokens.length;

    for (let curr = 0; curr < max; curr++) {
      if (tokens[curr].type === 'text_special') {
        tokens[curr].type = 'text';
      }
    }

    let curr = 0, last = 0;

    for (; curr < max; curr++) {
      if (tokens[curr].type === 'text' &&
        curr + 1 < max &&
        tokens[curr + 1].type === 'text' &&
        !tokens[curr].children &&
        !tokens[curr + 1].children
      ) {

        // 折叠两个相邻的文本节点
        tokens[curr + 1].content = tokens[curr].content + tokens[curr + 1].content;
      } else {
        if (curr !== last) { tokens[last] = tokens[curr]; }

        last++;
      }
    }

    if (curr !== last) {
      tokens.length = last;
    }
  }
};

export default text_join;
