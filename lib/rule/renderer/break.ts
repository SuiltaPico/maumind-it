import { MaudownItOption } from "../..";
import { RendererRuleProcessor } from "../../renderer/Renderer";

const generate_br_tag = (options: MaudownItOption) => {
  return options.xhtmlOut ? '<br />\n' : '<br>\n';
}

export const hardbreak: RendererRuleProcessor = (tokens, idx, options) => {
  return generate_br_tag(options);
};

export const softbreak: RendererRuleProcessor = (tokens, idx, options) => {
  return options.breaks ? generate_br_tag(options) : '\n';
};