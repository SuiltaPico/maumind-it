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

  /** 异标对子定界符关闭表 */
  const pair_stack_map: {
    [closer_marker: number]: [
      /** 栈数组 */
      indexes: [index: number, level: number][],
      /** 数组最后一个元素的位置 */
      pointer: number
    ]
  } = {}

  /** 同标对子定界符表 */
  const identical_pair_stack_map: {
    [closer_marker: number]: [
      indexes: [index: number, level: number][],
      pointer: number
    ]
  } = {}

  let level = 0;

  /** 忽略不同定界符的模式。只有判定了关闭定界符，才能被打开。不会影响到 map */
  let ignore_mode = false;
  const ignore_info = {
    /** 忽略的定界符标记 */
    marker: -1,
    /** 忽略模式的栈的最后索引。 */
    index: -1,
    /** 需要的目标定界符的 marker */
    require_marker: -1,
    level_before: 0,
    is_identical: false
  }



  for (let i = delimiters_len - 1; i >= 0; i--) {
    const de = delimiters[i];

    if (i == 6) {
      debugger
    }

    if (ignore_mode) {
      if (de.open) { continue }
      if (de.marker !== ignore_info.require_marker
        || (ignore_info.is_identical && de.match_target !== ignore_info.marker)
      ) { continue }

      const level_diff = level - ignore_info.level_before
      let can_close_closers = true
      let j = i - 1
      const first_de = de
      for (; j >= i - level_diff; j--) {
        const de = delimiters[j];
        if (de.marker !== ignore_info.require_marker || de.match_target !== ignore_info.marker
          || !de.ignore_others || de.token_index !== first_de.token_index - (i - j)
        ) {
          can_close_closers = false
          break
        }
      }
      if (can_close_closers) {
        ignore_mode = false
        i = j
        continue
      }
      i = j + 1
    }

    // !ignore_mode
    else {
      if (de.ignore_others) {
        if (!de.close) { continue }
        let j = i - 1
        for (; j >= 0; j--) {
          const _de = delimiters[j];
          if (_de.marker !== de.marker || _de.match_target !== _de.match_target
            || !_de.ignore_others || _de.token_index !== de.token_index - (i - j)
          ) {
            break
          }
        }
        ignore_mode = true
        ignore_info.index = i
        ignore_info.marker = de.marker
        ignore_info.require_marker = de.match_target ?? de.marker
        ignore_info.level_before = level
        ignore_info.is_identical = !de.match_target
        level += (i - j)
        i = j + 1
      } else if (de.match_target) {
        if (de.close) {
          let stack = pair_stack_map[de.marker]
          if (!stack) {
            stack = [Array(i), -1]
            for (let j = 0; j < i; j++) {
              stack[0][j] = [-1, -1]
            }
            pair_stack_map[de.marker] = stack
          }

          const stack_arr = stack[0]
          stack[1]++
          stack_arr[stack[1]][0] = i
          stack_arr[stack[1]][1] = level
          level++
        } else if (de.open) {
          const stack = pair_stack_map[de.match_target]
          if (!stack) { continue }
          const stack_arr = stack[0]

          const last = stack_arr[stack[1]]
          if (delimiters[last[0]].match_target !== de.marker || level - 1 > last[1]) { continue }
          level = last[1]
          de.end = last[0]
        }
      }
      // !de.match_target && !de.ignore_others
      // 同标对子定界符
      else {
        let stack = identical_pair_stack_map[de.marker]
        if (!stack) {
          stack = [Array(i), -1]
          for (let j = 0; j < i; j++) {
            stack[0][j] = [-1, -1]
          }
          identical_pair_stack_map[de.marker] = stack
        }
        const stack_arr = stack[0]

        // 清理等级高于当前的关闭定界符
        let j = stack[1]
        for (; j >= 0; j--) {
          if (stack_arr[j][1] <= level) { break }
        }
        stack[1] = j

        if (de.open && de.close) {
          // 优先考虑为关闭定界符 
          if (stack[1] === -1 || stack_arr[stack[1]][1] < level) {
            stack[1]++
            stack_arr[stack[1]][0] = i
            stack_arr[stack[1]][1] = level

            // 向前匹配关闭定界符
            let j = i - 1
            for (; j >= 0; j--) {
              const _de = delimiters[j];
              if (!_de.close || _de.marker !== de.marker
                || _de.match_target || _de.ignore_others
                || _de.token_index !== de.token_index - (i - j)
              ) {
                break
              }
              stack[1]++
              stack_arr[stack[1]][0] = j
              stack_arr[stack[1]][1] = level
            }
            i = j + 1
          } else {
            de.end = stack_arr[stack[1]][0]
            stack[1]--
          }
        } else if (de.close) {
          stack[1]++
          stack_arr[stack[1]][0] = i
          stack_arr[stack[1]][1] = level
          // 向前关闭匹配定界符
          let j = i - 1
          for (; j >= 0; j--) {
            const _de = delimiters[j];
            if (!_de.close || _de.marker !== de.marker
              || _de.match_target || _de.ignore_others
              || _de.token_index !== de.token_index - (i - j)
            ) {
              break
            }
            stack[1]++
            stack_arr[stack[1]][0] = j
            stack_arr[stack[1]][1] = level
          }
          i = j + 1
        } else if (de.open && stack[1] !== -1 && stack_arr[stack[1]][1] === level) {
          de.end = stack_arr[stack[1]][0]
          stack[1]--
        }
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