import Token, { Nesting } from "../../../Token";
import { FragmentMacroProcessor } from "../fragment_macro";

const make_anchor: FragmentMacroProcessor = (state, tokens, param) => {
  const open_token = new Token("link_open", "a", Nesting.Opening);
  const close_token = new Token("link_close", "a", Nesting.Closing);

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

  open_token.set_attr("id", id_value);
  open_token.set_attr("href", `#${id_value}`);
  
  tokens[0].children!.push(open_token)
  tokens[tokens.length - 1].children!.push(close_token)
}

export default make_anchor;