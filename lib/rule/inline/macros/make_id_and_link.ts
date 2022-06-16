import { FragmentMacroProcessor } from "../fragment_macro";

const make_id_and_link: FragmentMacroProcessor = (state, tokens, param) => {
  const open_token = tokens[0];
  const close_token = tokens[tokens.length - 1];

  open_token.type = "link_open";
  open_token.tag = "a";

  close_token.type = "link_close";
  close_token.tag = "a";

  let id_value = param.trim();
  if (id_value === "") {
    let content = ""
    for (let i = 1; i < tokens.length; i++) {
      content += tokens[i].content
    }
    id_value = content
  }

  open_token.set_attr("id", id_value);
  open_token.set_attr("href", `#${id_value}`);
}

export default make_id_and_link;