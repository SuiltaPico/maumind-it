import Token, { Nesting } from "../../../Token";
import { FragmentMacroProcessor } from "../fragment_macro";

const make_link: FragmentMacroProcessor = (state, tokens, param) => {
  const open_token = new Token("link_open", "a", Nesting.Opening);
  const close_token = new Token("link_close", "a", Nesting.Closing);

  let [link] = param.split(",").map(x => x.trim());
  if (link === "") {
    let content = ""
    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];
      content += token.content
      if (token.children) {
        content += token.children!.map(t => t.content).join("")
      }
    }
    link = content
  }

  open_token.set_attr("href", `${link}`);

  tokens[0].children!.push(open_token)
  tokens[tokens.length - 1].children!.push(close_token)
  console.log(tokens);
  
}

export default make_link;