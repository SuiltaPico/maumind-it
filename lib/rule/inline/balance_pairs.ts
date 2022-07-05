import { InlineRulePPProcessor } from "../../parser/ParserInline";
import InlineState, { Delimiter } from "../../state/InlineState";

/** 从后往前扫描，如果发现关闭定界符，则入栈，发现开启定界符则出栈。
 * 栈采用定长数组，提升性能，但是会占用更多内存。
 * 
 * 当前算法性能仍然有待提升。因为对于一些不可能发生的情况，当前算法仍然进行了检查。
*/

function process_delimiters(delimiters: Delimiter[]) {
  const delimiters_len = delimiters.length;
  if (!delimiters_len) return;

  const pair_stack_map: {
    [closer_marker: number]: [
      /** 栈数组 */
      indexes: [index: number, level: number][],
      /** 数组最后一个元素的位置 */
      pointer: number
    ]
  } = {}
  const same_pair_stack_map: {
    [closer_marker: number]: [
      indexes: [index: number, level: number][],
      pointer: number
    ]
  } = {}

  let level = 0;

  /** 忽略不同定界符的模式。只有判定了关闭定界符，才能被打开。 */
  let ignore_mode = false;
  const ignore_info: [
    /** 忽略的定界符标记 */
    marker: number,
    /** 忽略模式的栈的最后索引。 */
    index: number,
    /** 需要的目标定界符的 marker */
    require_marker: number
  ] = [-1, -1, -1];

  for (let i = delimiters_len - 1; i >= 0; i--) {
    const de = delimiters[i];

    if (ignore_mode && de.marker !== ignore_info[2]) { continue }

    if (de.match_target !== undefined) {
      // 这里处理有匹配目标的定界符，如 `[` 和 `]`。

      /** 关闭定界符的记录栈 */
      let closer_record = de.open ?
        pair_stack_map[de.match_target] : pair_stack_map[de.marker]

      /** 如果没有，则新建一个记录栈 */
      if (!closer_record) {
        const len = i + 1
        closer_record = [(Array(len) as [number, number][]), -1]
        for (let x = 0; x < closer_record[0].length; x++) {
          closer_record[0][x] = [-1, Infinity]
        }
        pair_stack_map[de.marker] = closer_record
      }

      /** 栈数组 */
      const records = closer_record[0]

      // 删除大于 level 的所有记录
      let x = closer_record[1]
      for (; x >= 0; x--) {
        const record = records[x];
        if (record[1] <= level) {
          break
        }
      }
      closer_record[1] = x

      // 如果是 ignore_mode ，仅匹配 de.close
      if (de.close && !ignore_mode) {
        level++
        closer_record[1]++
        records[closer_record[1]][0] = i
        records[closer_record[1]][1] = level
        if (de.ignore_others) {
          ignore_mode = true
          ignore_info[0] = de.marker
          ignore_info[1] = i
          ignore_info[2] = de.match_target
        }
      } else if (de.open && closer_record[1] !== -1) {
        level--
        de.end = records[closer_record[1]][0]
        closer_record[1]--
        if (ignore_mode) {
          ignore_mode = false
        }
      }
    } else {
      // 处理无匹配目标（即匹配目标为自身）的定界符，如 `*` 和 `_` 等。

      /** 关闭定界符的记录 */
      let closer_record = same_pair_stack_map[de.marker]
      if (!closer_record) {
        const len = i + 1
        closer_record = [(Array(len) as [number, number][]), -1]
        for (let x = 0; x < closer_record[0].length; x++) {
          closer_record[0][x] = [-1, Infinity]
        }
        same_pair_stack_map[de.marker] = closer_record
      }

      /** 栈数组 */
      const records = closer_record[0]

      // 删除大于 level 的所有记录
      let x = closer_record[1]
      for (; x >= 0; x--) {
        const record = records[x];
        if (record[1] <= level) {
          break
        }
      }
      closer_record[1] = x

      // 虽然栈顶的 record 有可能是上一层的，但是因为有 token_index 判断，所以不会造成影响
      if (de.close && de.open) {
        // 如果栈为空或当前定界符与上一个定界符邻接，如 `**` 会被识别为两个关闭的定界符。
        if (closer_record[1] === -1
          || delimiters[records[closer_record[1]][0]].token_index === de.token_index + 1
        ) {
          closer_record[1]++
          records[closer_record[1]][0] = i
          records[closer_record[1]][1] = level
          if (de.ignore_others) {
            ignore_mode = true
            ignore_info[0] = de.marker
            ignore_info[1] = i
            ignore_info[2] = de.marker
          }
        }
        // 层级相同才能匹配
        else if (ignore_mode
          || (closer_record[1] !== -1 && records[closer_record[1]][1] === level)
        ) {
          de.end = records[closer_record[1]][0]
          closer_record[1]--
          if (ignore_mode) {
            ignore_mode = false
          }
        }
      } else if (de.close) {
        closer_record[1]++
        records[closer_record[1]][0] = i
        records[closer_record[1]][1] = level
        if (de.ignore_others) {
          ignore_mode = true
          ignore_info[0] = de.marker
          ignore_info[1] = i
          ignore_info[2] = de.marker
        }
      } else if (de.open && closer_record[1] !== -1) {
        de.end = records[closer_record[1]][0]
        closer_record[1]--
      }
    }
  }
}

const balance_pairs: InlineRulePPProcessor = (state) => {
  const tokens_meta = state.tokens_meta,
    max = state.tokens_meta.length;

  process_delimiters(state.delimiters);

  for (let curr = 0; curr < max; curr++) {
    if (tokens_meta[curr] && tokens_meta[curr].delimiters) {
      process_delimiters(tokens_meta[curr].delimiters);
    }
  }
};

export default balance_pairs;