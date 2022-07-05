
// import CoreState from "../../state/CoreState";
// import Token from "../../Token";

// import _ from "lodash"


// function isLinkOpen(str: string) {
//   return /^<a[>\s]/i.test(str);
// }
// function isLinkClose(str: string) {
//   return /^<\/a\s*>/i.test(str);
// }

// /** 用链接节点替换类似链接的文本，仅扫描 inline token。
//  * 仅当 `MaudownIt.options.linkify` 为 true 时开启 
//  * 
//  * 当前受 `md.validateLink()` 限制为 http/https/ftp
//  * 
// */
// export default function (state: CoreState) {
//   var i, j, l, tokens, token, currentToken, nodes, ln, text, pos, lastPos,
//     level, htmlLinkLevel, url, fullUrl, urlText,
//     links;

//   let block_tokens = state.tokens

//   if (!state.md.options.linkify) return;

//   for (j = 0, l = block_tokens.length; j < l; j++) {
//     let block_token = block_tokens[j]

//     // 跳过非 inline token 和不通过 linkify 测试的 token
//     if (block_token.type !== 'inline' ||
//       !state.md.linkify.pretest(block_token.content)) {
//       continue;
//     }

//     let tokens = block_token.children!;

//     /** 当前 Token 所在的 HTML `<a>` 元素链接的层级 
//      * 
//      * 如解析
//      * ``` html
//      * <a>
//      *  x<a>y</a>z
//      * </a>
//      * ```
//      * 中的 "y" 对应的 Token 时，`htmlLinkLevel` 为 2
//      */
//     let htmlLinkLevel = 0;

//     // 我们从末尾扫描，以便在添加新标签时保持位置。
//     // 在链接开始/结束匹配中使用反向逻辑
//     for (let i = tokens.length - 1; i >= 0; i--) {

//       /** 当前的 Token */
//       let currentToken = tokens[i];

//       //- 不处理已被解析成链接的内容
//       if (currentToken.type === 'link_close') {
//         i--;
//         while (tokens[i].level !== currentToken.level && tokens[i].type !== 'link_open') {
//           i--;
//         }
//         continue;
//       }
//       //--

//       //- 不解析 a 标签的内容

//       // 由于是反向解析的，所以 htmlLinkLevel 也是反着记录
//       if (currentToken.type === 'html_inline') {
//         if (isLinkOpen(currentToken.content) && htmlLinkLevel > 0) {
//           htmlLinkLevel--;
//         }
//         if (isLinkClose(currentToken.content)) {
//           htmlLinkLevel++;
//         }
//       }
//       // 仍然在 a 内，不解析
//       if (htmlLinkLevel > 0) { continue; }

//       //--

//       // 仅处理 type 为 text 的 token
//       if (currentToken.type === 'text' && state.md.linkify.test(currentToken.content)) {

//         let content = currentToken.content;
//         let links = state.md.linkify.match(content)!;

//         // 将字符串拆分为节点
//         let nodes = [];
//         let level = currentToken.level;
//         let lastPos = 0;
// /*
//         for (let ln = 0; ln < links.length; ln++) {

//           let url = links[ln].url;
//           let fullUrl = state.md.normalizeLink(url);
//           if (!state.md.validateLink(fullUrl)) { continue; }

//           urlText = links[ln].text;

//           // Linkifier might send raw hostnames like "example.com", where url
//           // starts with domain name. So we prepend http:// in those cases,
//           // and remove it afterwards.
//           //
//           if (!links[ln].schema) {
//             urlText = state.md.normalizeLinkText('http://' + urlText).replace(/^http:\/\//, '');
//           } else if (links[ln].schema === 'mailto:' && !/^mailto:/i.test(urlText)) {
//             urlText = state.md.normalizeLinkText('mailto:' + urlText).replace(/^mailto:/, '');
//           } else {
//             urlText = state.md.normalizeLinkText(urlText);
//           }

//           pos = links[ln].index;

//           if (pos > lastPos) {
//             token = new Token('text', '', 0);
//             token.content = content.slice(lastPos, pos);
//             token.level = level;
//             nodes.push(token);
//           }

//           token = new Token('link_open', 'a', 1);
//           token.set_attr('href', fullUrl)
//           token.level = level++;
//           token.markup = 'linkify';
//           token.info = 'auto';
//           nodes.push(token);

//           token = new Token('text', '', 0);
//           token.content = urlText;
//           token.level = level;
//           nodes.push(token);

//           token = new Token('link_close', 'a', -1);
//           token.level = --level;
//           token.markup = 'linkify';
//           token.info = 'auto';
//           nodes.push(token);

//           lastPos = links[ln].lastIndex;
//         }
//         if (lastPos < content.length) {
//           token = new Token('text', '', 0);
//           token.content = content.slice(lastPos);
//           token.level = level;
//           nodes.push(token);
//         }

//         // replace current node
//         block_token.children = tokens = arrayReplaceAt(tokens, i, nodes);*/
//       }
//     }
//   }
// };
