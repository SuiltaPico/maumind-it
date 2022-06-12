import { BlockPPRuleProcessor } from "../../parser/ParserBlock";
import { Nesting } from "../../Token";

const section_close_fixer: BlockPPRuleProcessor = (state) => {
  const section_infos = state.section_infos;
  if (section_infos.length > 0) {
    for (let i = section_infos.length - 1; i >= 0; i--) {
      const section_info = section_infos[i];
      const section_close_token = state.push('section_close', "section", Nesting.Closing);
      section_close_token.within_name = section_info[0];
    }
    state.section_infos = []
  }
}

export default section_close_fixer