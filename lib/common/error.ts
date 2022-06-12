import BlockState from "../state/BlockState";

export function throw_parse_block_error(state: BlockState, rule_name: string, content: string): never {
  const { line_index } = state;
  const line_number = line_index + 1;
  const error_message = `ParserBlock Error(rule: ${rule_name}) at line ${line_index + 1}.\n${state.get_lines(line_index, line_index+1)}\n${content}`;
  throw new Error(error_message);
}