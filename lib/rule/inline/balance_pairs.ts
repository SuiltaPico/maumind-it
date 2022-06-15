import { InlineRulePPProcessor } from "../../parser/ParserInline";
import InlineState, { Delimiter } from "../../state/InlineState";

function process_delimiters(delimiters: Delimiter[]) {
  const delimiters_len = delimiters.length;
  if (!delimiters_len) return;

  const pair_stack_map: {
    [closer_marker: number]: [
      indexes: [index: number, level: number][],
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

  for (let i = delimiters_len - 1; i >= 0; i--) {
    const de = delimiters[i];
    if (de.match_target !== undefined) {
      let closer_record = de.open ?
        pair_stack_map[de.match_target] : pair_stack_map[de.marker]

      if (!closer_record) {
        const len = Math.ceil(i / 2) + 1
        closer_record = [(Array(len) as [number, number][]), -1]
        for (let x = 0; x < closer_record[0].length; x++) {
          closer_record[0][x] = [-1, Infinity]
        }
        pair_stack_map[de.marker] = closer_record
      }

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

      if (de.close) {
        level++
        closer_record[1]++
        records[closer_record[1]][0] = i
        records[closer_record[1]][1] = level
      } else if (de.open) {
        level--
        if (closer_record[1] === -1) { continue }
        de.end = records[closer_record[1]][0]
        closer_record[1]--
      }
    } else {
      let closer_record = same_pair_stack_map[de.marker]
      if (!closer_record) {
        const len = Math.ceil(i / 2) + 1
        closer_record = [(Array(len) as [number, number][]), -1]
        for (let x = 0; x < closer_record[0].length; x++) {
          closer_record[0][x] = [-1, Infinity]
        }
        same_pair_stack_map[de.marker] = closer_record
      }

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
        if (closer_record[1] === -1
          || delimiters[records[closer_record[1]][0]].token_index === de.token_index + 1
        ) {
          closer_record[1]++
          records[closer_record[1]][0] = i
          records[closer_record[1]][1] = level
        } else {
          de.end = records[closer_record[1]][0]
          closer_record[1]--
        }
      } else if (de.close) {
        closer_record[1]++
        records[closer_record[1]][0] = i
        records[closer_record[1]][1] = level
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