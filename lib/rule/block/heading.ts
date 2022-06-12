// heading (#, ##, ...)
import { throw_parse_block_error } from "../../common/error";
import { BlockRuleProcessor } from "../../parser/ParserBlock";
import { Nesting } from "../../Token";

const heading: BlockRuleProcessor = (state, startLine, endLine, silent) => {
  const first_line = state.cs_arr[startLine];
  const first_code = first_line.charCodeAt(0);

  const section_infos = state.section_infos;
  const rr_indexes = state.rr_indexes

  function close_last_section() {
    const index = section_infos.length - 1
    const last_section_info = section_infos[index];
    const section_close_token = state.push('section_close', "section", Nesting.Closing);
    section_close_token.within_name = last_section_info[0];
    section_infos.pop()
    if (rr_indexes[rr_indexes.length - 1] === index) {
      rr_indexes.pop()
    }
  }

  if (first_code === 0x23 /* # */ || first_code === 0x40 /* @ */) {

    // 层标仅匹配数字，防止层标为负数的情况出现。
    const heading_open_RE = /^(?<node>\@)?\#(?<relative>\^)?(?<level_marker>[\d_]+)?[\s]*(?:\:\([\s]*(?<within_name>[^\s]*)[\s]*\))?[\s]+(?<name>[^]+)$/

    const match_res = first_line.match(heading_open_RE)

    if (!match_res) { return false; }

    let { node, relative, level_marker, within_name, name } = match_res.groups!;

    /** 层标所代表的层级 */
    let level = 1
    if (level_marker) {
      // 计算标题层级
      level = parseInt(level_marker.replace(/_/g, ''), 10)
      if (isNaN(level)) { return false }
    }

    if (silent) { return true; }

    let last_level = 0, last_relative_level = 0

    let last_section_info = section_infos[section_infos.length - 1];
    if (last_section_info) {
      last_level = last_section_info[1];
      last_relative_level = last_section_info[2] ?? last_level;
    }

    /** 当前层标所指定的实际层级。 */
    let actual_level: number
    /** 当前节段的相对层级。 */
    let relative_level: number | undefined = undefined
    if (level_marker && !relative) {
      /** `#1 ...` 的情况 */
      actual_level = level - last_relative_level + last_level
      relative_level = actual_level
    } else if (level_marker && relative) {
      /** `#^1 ...` 的情况 */
      actual_level = last_level + 1
      relative_level = level
    } else if (!level_marker && relative) {
      /** `#^ ...` 的情况 */
      throw_parse_block_error(state, "heading", '标题使用相对标记时，必须指定层标。')
    } else {
      /** `# ...` 的情况，`relative_level` 被认为是 0 */
      actual_level = last_level + 1
      relative_level = 0
    }

    const last_rr_index =
      state.rr_indexes[state.rr_indexes.length - 1]
      ?? -1

    /** 
     * ```ud
     * #1 ...
     * #3 该部分实际层级为 2
     * ```
     */
    if (actual_level > last_level + 1) {
      actual_level = last_level + 1
    } else if (actual_level < last_level || last_rr_index && actual_level === last_rr_index) {
      // console.log(state.section_infos, actual_level, last_level);

      // 标题层级小于根最深的相对层级的层级，不识别为标题
      if (relative && actual_level <= section_infos[last_rr_index][1]) {
        return false
      }
      // 否则，关闭大于等于当前 `actual_level` 的所有节段
      let index = section_infos.length - 1
      while (index >= 0 && actual_level <= last_section_info[1]) {
        close_last_section()
        index--
        last_section_info = section_infos[index]
      }
    }

    if (!within_name) {
      within_name = name.trim()
      const last_code = within_name.charCodeAt(within_name.length - 1)
      // 如果 `last_code` 是数字，则在 `within_name` 后附加 `_`
      if (last_code >= 0x30 && last_code <= 0x39) {
        within_name += '_'
      }
      // 替换所有空白字符为 `_`
      // 替换所有 `%` 字符为 `%25`，防止作为链接时被识别为转义
      within_name = within_name.replace(/\s/g, '_').replace(/%/g, '%25')
    }

    // if (actual_level < 0) {
    // console.log({ actual_level, last_relative_level, last_level, level });
    // }


    if (relative_level !== undefined) { state.rr_indexes.push(section_infos.length) }
    section_infos.push([within_name, actual_level, relative_level ?? last_relative_level + 1])

    state.line_index += 1;

    const section_open_token = state.push('section_open', "section", Nesting.Opening);
    section_open_token.within_name = within_name
    section_open_token.info = node ? 'node' : 'content'
    section_open_token.section_level = actual_level
    section_open_token.join_attr("id", within_name)

    const open_token = state.push('heading_open', 'div', Nesting.Opening)
    open_token.map = [startLine, state.line_index]
    open_token.push_class("header header-" + actual_level)

    const token = state.push('inline', '', Nesting.SelfClosing)
    token.content = name.trim()
    token.map = [startLine, state.line_index]
    token.children = []

    state.push('heading_close', 'div', Nesting.Closing)

    return true

  } else if (first_code === 0x21 /* ! */) {
    const heading_close_RE = /^\!\#[\s]*(?<name>[^]+)?[\s]*$/
    const match_res = first_line.match(heading_close_RE)
    if (!match_res) { return false; }
    const { name } = match_res.groups!;
    if (name) {
      const si_index = section_infos.findIndex(([within_name]) => within_name === name)
      if (si_index > -1) {
        if (silent) { return true }
        for (let i = section_infos.length - 1; i >= si_index; i--) {
          close_last_section()
        }
      } else {
        if (silent) { return true }
        throw_parse_block_error(state, "heading", "Attempt to close section, but no matching section name: " + name);
      }
    } else if (section_infos.length > 0) {
      const last_rr_index = state.rr_indexes.length - 1
      if (last_rr_index > -1) {
        if (silent) { return true }
        for (
          let i = section_infos.length - 1;
          i >= rr_indexes[last_rr_index];
          i--
        ) {
          close_last_section()
        }
      } else {
        if (silent) { return true }
        throw_parse_block_error(state, "heading", "多余的节段关闭标记，没有相对标签需要关闭。");
      }
    } else {
      if (silent) { return false }
      throw_parse_block_error(state, "heading", "多余的节段关闭标记。");
    }

    if (!silent) { state.line_index += 1; }
    return true
  }

  return false
}

export default heading