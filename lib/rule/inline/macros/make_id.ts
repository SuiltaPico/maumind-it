import { FragmentMacroProcessor } from "../fragment_macro";

const make_id: FragmentMacroProcessor = (state, tokens, param) => {
  const token = tokens[0];
  let id_value = param.trim();
  if (id_value === "") {
    let content = ""
    for (let i = 1; i < tokens.length; i++) {
      content += tokens[i].content
    }
    id_value = content
  }

  token.set_attr("id", id_value);
}

export default make_id;