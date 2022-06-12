//import entities_map from "entities/lib/maps/entities.json";

/** 匹配数字 HTML 实体 */
const DIGITAL_ENTITY_TEST_RE = /^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))/i;

/** 匹配HTML 实体，如 `&nbsp;` */
export const ENTITY_RE = /&([a-z#][a-z0-9]{1,31});/gi;
/*
export function replace_entity_pattern(match: string, name: string) {
  var code = 0;

  if (Object.hasOwn(entities_map, name)) {
    return entities_map[name];
  }

  if (name.charCodeAt(0) === 0x23 && DIGITAL_ENTITY_TEST_RE.test(name)) {
    code = name[1].toLowerCase() === 'x' ?
      parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);

    if (is_valid_entity_code(code)) {
      return from_code_point(code);
    }
  }

  return match;
}*/

function from_code_point(code: number) {
  /*eslint no-bitwise:0*/
  if (code > 0xffff) {
    code -= 0x10000;
    var surrogate1 = 0xd800 + (code >> 10),
        surrogate2 = 0xdc00 + (code & 0x3ff);

    return String.fromCharCode(surrogate1, surrogate2);
  }
  return String.fromCharCode(code);
}


function is_valid_entity_code(code: number) {
  /*eslint no-bitwise:0*/
  // 断序的
  if (code >= 0xD800 && code <= 0xDFFF) { return false; }
  // 未被使用的
  if (code >= 0xFDD0 && code <= 0xFDEF) { return false; }
  if ((code & 0xFFFF) === 0xFFFF || (code & 0xFFFF) === 0xFFFE) { return false; }
  // 控制代码
  if (code >= 0x00 && code <= 0x08) { return false; }
  if (code === 0x0B) { return false; }
  if (code >= 0x0E && code <= 0x1F) { return false; }
  if (code >= 0x7F && code <= 0x9F) { return false; }
  // 超出范围
  if (code > 0x10FFFF) { return false; }
  return true;
}