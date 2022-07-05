import Token, { Nesting } from "../../../Token";
import { FragmentMacroProcessor } from "../fragment_macro";

const make_image: FragmentMacroProcessor = (state, tokens, param) => {
  const open_token = new Token("image", "img", Nesting.SelfClosing);

  open_token.type = "image";
  open_token.tag = "img";
  open_token.nesting = Nesting.SelfClosing;

  let [alt_text, width, height, link] = param.split(",").map(s => s.trim());

  let url = ""
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    url += token.content
    token.content = ""
    if (token.children) {
      url += token.children!.map(t => {
        const content = t.content;
        t.content = ""
        return content
      }).join("")
    }
  }

  open_token.content = url
  open_token.set_attr("src", `${url}`);
  if (alt_text) {
    open_token.set_attr("alt", `${alt_text}`);
  }
  if (width) {
    open_token.set_attr("width", `${width}`);
  }
  if (height) {
    open_token.set_attr("height", `${height}`);
  }
  if (link) {
    open_token.type = "a";
    open_token.tag = "link_open";
    open_token.nesting = Nesting.Opening;
    open_token.set_attr("href", `${link}`);
  }

  tokens[0].children!.push(open_token)
}

export default make_image;