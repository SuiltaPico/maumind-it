import { FragmentMacroProcessor } from "../fragment_macro";

const make_id: FragmentMacroProcessor = (state, tokens, param) => {
  const token = tokens[0];
  let id_value = param.trim();
  if (id_value === "") {
    let content = ""
    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];
      content += token.content
      if (token.children) {
        content += token.children!.map(t => t.content).join("")
      }
    }
    id_value = content
  }
  const children_len = token.children!.length;
  if (children_len === 0) {
    token.set_attr("id", id_value);
  } else {
    token.children![children_len - 1].set_attr("id", id_value);
  }
}

export default make_id;