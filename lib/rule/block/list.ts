// Lists
/** 
 * Tokens:
 * * `list_item_open`:
 *  * `info` 有序列表标记的数字标记
 */

import is_space from "../../common/is_space";
import { BlockRuleProcessor } from "../../parser/ParserBlock";
import BlockState from "../../state/BlockState";
import Token, { Nesting } from "../../Token";

/** 跳过无序列表标记 `[-*][\t \n]`，如果成功，返回行的字符索引；否则返回 -1 */
function skip_bullet_list_marker(state: BlockState, start_line: number) {
  const line_content = state.cs_arr[start_line];

  if (line_content.length < 2) { return -1; }

  const marker = line_content.charCodeAt(0);

  // 检查项目符号
  if (
    marker !== 0x2A/* * */
    && marker !== 0x2D/* - */
  ) { return -1; }

  const ch = line_content.charCodeAt(1);

  if (!is_space(ch)) {
    // `-test` 不是列表项
    return -1;
  }

  return 2;
}

/** 跳过有序列表标记 `\d*[.][\n ]`，如果成功，返回行的字符索引；否则返回 -1 */
function skip_ordered_list_marker(state: BlockState, start_line: number) {
  const line_content = state.cs_arr[start_line];
  const length = line_content.length;

  if (length < 2) { return -1; }

  let pos = 0;

  // 跳过\d*[.]
  for (; pos < length;) {
    // EOL -> fail
    if (pos >= length) { return -1; }

    const ch = line_content.charCodeAt(pos);

    pos++

    if (ch >= 0x30/* 0 */ && ch <= 0x39/* 9 */) {

      // 列表标记的位数不应超过9位（防止浏览器中的整数溢出）
      if (pos >= 9) { return -1; }
      continue;
    }

    if (ch === 0x2e/* . */) { break; }

    return -1;
  }

  // [\t ]
  if (pos) {
    const ch = line_content.charCodeAt(pos);

    if (!is_space(ch)) {
      // " 1.test " - is not a list item
      return -1;
    }
  }
  return pos;
}

function match_list_item(state: BlockState, start_line: number) {
  const line_content = state.cs_arr[start_line];

  let is_ordered = false
  let pos_after_marker: number
  let marker_value: number | undefined

  // 检测标记后的列表类型和位置
  if ((pos_after_marker = skip_ordered_list_marker(state, start_line)) >= 0) {
    is_ordered = true;
    marker_value = parseInt(line_content.slice(0, pos_after_marker - 1));
  } else if (!((pos_after_marker = skip_bullet_list_marker(state, start_line)) >= 0)) {
    return false;
  }

  return {
    is_ordered,
    pos_after_marker,
    marker_value
  }
}


const list: BlockRuleProcessor = (state, start_line, end_line, silent) => {
  let is_terminating_paragraph = false
  let tight = false

  const cs_arr = state.cs_arr
  const first_code = cs_arr[start_line].charCodeAt(0)

  if (
    first_code !== 0x2D/* - */ && first_code !== 0x2A/* * */ && first_code !== 0x2e/* . */
    && (first_code < 0x30 || first_code > 0x3A)
  ) { return false; }

  const indent_count = state.indent_count

  const list_indent = indent_count[start_line]

  // 列表可以中断段落时的限制条件（仅限验证模式）
  if (silent && state.parent_type === 'paragraph') {
    if (indent_count[start_line] >= state.block_indent) {
      is_terminating_paragraph = true;
    }
  }

  const list_item_info = match_list_item(state, start_line)
  if (!list_item_info) { return false }

  let { is_ordered, pos_after_marker, marker_value } = list_item_info

  // 如果我们在段落后立即开始一个新的无序列表，则第一行不应为空。
  /*if (is_terminating_paragraph) {
    if (
      state.skip_space(pos_after_marker) >=
      state.line_begin_index[start_line]
    ) return false;
  }*/

  // 对于验证模式，我们可以立即终止
  if (silent) { return true; }

  // 我们应该在样式更改时终止列表。记住第一个要比较的。

  /** 列表标记符号 */
  const marker_char_code = state.src.charCodeAt(pos_after_marker - 1);

  let list_open_token: Token
  let list_token_closer: () => Token

  let push_res: ReturnType<BlockState["push_and_create_closer"]>

  if (is_ordered) {
    push_res = state.push_and_create_closer('ordered_list', 'ol');
    if (marker_value !== 1) {
      push_res.open_token.set_attr("start", marker_value!.toString())
    }
  } else {
    push_res = state.push_and_create_closer('bullet_list', 'ul');
  }

  list_open_token = push_res.open_token
  list_token_closer = push_res.closer

  const list_lines = list_open_token.map = [start_line, 0];

  list_open_token.markup = String.fromCharCode(marker_char_code);

  // ----- 迭代列表项 -----

  /** 下一行的索引 */
  let next_line = start_line;

  state.push_props()
  state.set_props({
    parent_type: "list"
  })

  while (next_line < end_line) {
    let pos = pos_after_marker;
    const line_content = cs_arr[next_line]
    const line_indent = state.indent_count[next_line]
    const max = line_content.length;

    if (line_indent < list_indent) {
      break
    }

    // 跳过标记与内容之间的空白。
    // .    something
    // ^ -> ^
    for (; pos < max; pos++) {
      const ch = state.src.charCodeAt(pos);
      if (ch !== 0x09 && ch !== 0x20) {
        break;
      }
    }

    // 运行子 Parser 并写入 token
    const item_open_token = state.push('list_item_open', 'li', Nesting.Opening);
    item_open_token.markup = String.fromCharCode(marker_char_code);
    item_open_token.map = [start_line, 0];
    if (is_ordered) {
      item_open_token.info = line_content.slice(0, pos_after_marker - 1);
    }

    // 在这里，next_line 是列表标记所在的行

    /** 内容末行 */
    let content_line = next_line + 1

    // 扫描非内容行
    for (; ; content_line++) {
      // 对空行不予缩进判断
      const res = state.skip_empty_line(content_line)
      if (res > 0) { content_line = res; }

      const line_indent = indent_count[content_line]
      if (line_indent < list_indent + 1) {
        content_line -= 1
        break
      } else if (content_line >= end_line) {
        content_line = end_line - 1;
        break
      }
    }

    // 创建假进数组，让项头内容的缩进右移一位，与项身内容保持一致。
    const new_indent_count = indent_count.slice(next_line, content_line + 1)
    new_indent_count[0] = list_indent + 1

    const paragraph_open_token_index = state.tokens.length

    // 去除列表标记，token 化内容
    state.md.block.range_tokenize(
      state, [next_line, pos_after_marker], [content_line],
      new_indent_count,
    );
    if (state.tokens[paragraph_open_token_index]) {
      state.tokens[paragraph_open_token_index].hidden = true;
    state.tokens[paragraph_open_token_index + 2].hidden = true;
    }
    


    const item_close_token = state.push('list_item_close', 'li', Nesting.Closing);
    item_close_token.markup = String.fromCharCode(marker_char_code);

    next_line = content_line + 1;

    if (
      next_line >= end_line
      || line_indent < list_indent
    ) { break; }

    // 如果列表有其他类型，则停止项生成
    let item_info = match_list_item(state, next_line)

    if (!item_info) {
      break
    } else {
      const {
        is_ordered: next_is_ordered,
        pos_after_marker: next_pos_after_marker,
        marker_value: next_marker_value
      } = item_info

      if (
        is_ordered !== next_is_ordered
        || (is_ordered && !isNaN(next_marker_value!))
      ) {
        break
      }

      pos_after_marker = next_pos_after_marker
    }

  }

  // 最终确定列表
  const list_close_token = list_token_closer()
  list_close_token.markup = String.fromCharCode(marker_char_code);

  list_lines[1] = next_line;
  state.line_index = next_line;

  state.revert()

  return true;
};

export default list
