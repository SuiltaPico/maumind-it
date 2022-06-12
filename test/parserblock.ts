import { isArray } from "lodash";
import MaudownIt from "../lib";
import ParserBlock from "../lib/parser/ParserBlock";
import Token from "../lib/Token";

let tokens: Token[] = []
let pb = new ParserBlock
let md = new MaudownIt

// pb.parse(
//   `#1 tyytyyt
// #2 ertretert

// yuyt
// poipoi
//   rttt
// `, md, {}, tokens)

// tokens.forEach(t => {
//   for (const key in t) {
//     if (Object.prototype.hasOwnProperty.call(t, key)) {
//       // @ts-ignore
//       const prop = t[key];
//       if (prop === undefined || prop === ''
//         || (prop === false && key === "hidden")
//         || (isArray(prop) && prop.length === 0)
//         || (key === "attrs" && Object.getOwnPropertyNames(prop).length === 0)
//         || ((key === "level" || key === "nesting") && prop === 0)
//       ) {
//         // @ts-ignore
//         delete t[key]
//       }
//     }
//   }
// })

//console.log(tokens);
