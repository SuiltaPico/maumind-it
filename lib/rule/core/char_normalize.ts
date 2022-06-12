import CoreState from "../../state/CoreState";

const NEWLINES_RE = /\r\n?/g;
const NULL_RE = /\0/g;

export default function (state: CoreState) {
  // 规范化换行符
  let str = state.src.replace(NEWLINES_RE, '\n');

  // 替换空字符
  str = str.replace(NULL_RE, '\uFFFD');

  state.src = str;
};
