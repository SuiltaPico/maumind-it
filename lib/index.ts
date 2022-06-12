import LinkifyIt from "linkify-it";
import { IndentInfo, IndentMode } from "./common/indent";
import { AfterFirstParameters, Optional, ValueOfArray } from "./common/types";
import ParserBlock from "./parser/ParserBlock";
import ParserCore from "./parser/ParserCore";
import ParserInline from "./parser/ParserInline";
import Renderer from "./renderer/Renderer";
import { RuleFn } from "./Ruler/Rule";
import Ruler from "./Ruler/Ruler";
import CoreState from "./state/CoreState";

export interface RulerSwitchTable {
  [key: string]: boolean
}

/** 规则开关表 */
export interface RulerSwitchTableMap {
  core?: RulerSwitchTable
  block?: RulerSwitchTable
  inline?: RulerSwitchTable
  inline_post_processing?: RulerSwitchTable
  renderer?: RulerSwitchTable
}

const rule_groups_name = [
  "core", "block", "inline", "inline_post_processing", "renderer"
] as const

export type RuleGroupsName = ValueOfArray<typeof rule_groups_name>

export interface MaudownItEnv {
  latex_render: string
  indent_info: IndentInfo
  [key: string]: any
}

export default class MaudownIt {
  options = {
    max_nesting: Infinity,
    linkify: new LinkifyIt,
    xhtmlOut: false,
    breaks: false,
    highlight: (() => "") as (
      (content: string, lang_name: string, lang_attrs: string) => string
    ),
    html: false,
  }
  linkify = new LinkifyIt
  core = new ParserCore
  block = new ParserBlock
  inline = new ParserInline
  renderer = new Renderer
  //id = generate_available_id()
  //env = 

  /** 控制指定规则的启用与禁用。 */
  set_enable(map: RulerSwitchTableMap, ignore_invalid: boolean) {
    let result: { [key: string]: string[] } = {};

    Object.entries(map).forEach(([process_name, t]: [string, RulerSwitchTable]) => {
      result[process_name] = this.#process_switch_table(
        t, this.#get_ruler(process_name as RuleGroupsName)!, ignore_invalid
      )
    })

    return result;
  }

  #process_switch_table(table: RulerSwitchTable, ruler: Ruler<RuleFn>, ignore_invalid: boolean) {
    let table_entries = Object.entries(table)
    let result: string[]
    result = ruler.enable(
      table_entries.filter(([_, enable]) => {
        return enable
      }).map(([name]) => {
        return name
      }), ignore_invalid
    )
    result.push(...ruler.disable(
      table_entries.filter(([_, enable]) => {
        return !enable
      }).map(([name]) => {
        return name
      }), ignore_invalid
    ))
    return result
  }

  #get_ruler(rule_group: RuleGroupsName): Ruler<RuleFn> {
    if (rule_group === "core" || rule_group === "block" || rule_group === "inline" || rule_group === "renderer") {
      return this[rule_group].ruler
    } else if (rule_group === "inline_post_processing") {
      return this.inline.ruler
    } else {
      throw new Error(`MaudownIt: Undefined rule group name ${rule_group}`);
    }
  }

  /** 获取规则组 `rule_group` 的所有规则。 */
  get_rules(rule_group: RuleGroupsName) {
    let res = this.#get_ruler(rule_group)
    if (res) {
      return res.get_rules()
    }
  }

  /** 获取所有规则组名。 */
  get_rule_groups_name() {
    return rule_groups_name
  }

  /** 将具有给定参数的指定插件加载到当前解析器实例中。 */
  use<T extends (md: MaudownIt, ...args: any) => any>(
    plugin: T,
    ...args: AfterFirstParameters<MaudownIt, T>
  ) {
    const final_args = [this, ...args] as const;
    plugin(...final_args)
    return this;
  }

  parse(src: string, env?: Optional<MaudownItEnv>) {
    const state = new CoreState(src, this, this.#env_combine(env));
    this.core.process(state);
    return state.tokens;
  }

  async render(src: string, env?: Optional<MaudownItEnv>) {
    const combined_env = this.#env_combine(env)
    const tokens = this.parse(src, combined_env)

    return await this.renderer.render(
      tokens, this.options, combined_env
    );
  }

  parse_inline(src: string, env?: Optional<MaudownItEnv>) {
    const state = new CoreState(src, this, this.#env_combine(env));
    state.inline_mode = true;
    this.core.process(state);
    return state.tokens;
  }

  async render_inline(src: string, env?: Optional<MaudownItEnv>) {
    return await this.renderer.render(this.parse_inline(src, env), this.options, this.#env_combine(env));
  }

  #env_combine(env?: Optional<MaudownItEnv>): MaudownItEnv {
    return {
      latex_render: "katex",
      indent_info: {
        mode: IndentMode.Unknown,
        size: 4,
      },
      ...env
    }
  }
}

export type MaudownItOption = MaudownIt["options"]