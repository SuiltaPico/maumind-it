// import codes from "../../common/codes";
// import { BlockRuleProcessor } from "../../parser/ParserBlock";

// let fence: BlockRuleProcessor = function (state, start_line, end_line, silent) {
//     var marker, len, params, nextLine, mem, token, markup,
//         haveEndMarker = false,
//         pos = state.cs_line_start[startLine] + state.tShift[startLine],
//         max = state.eMarks[startLine];

//     if (pos + 3 > max) { return false; }

//     marker = state.src.charCodeAt(pos);

//     if (marker !== codes && marker !== 0x60 /* ` */) {
//         return false;
//     }

//     // scan marker length
//     mem = pos;
//     pos = state.skipChars(pos, marker);

//     len = pos - mem;

//     if (len < 3) { return false; }

//     markup = state.src.slice(mem, pos);
//     params = state.src.slice(pos, max);

//     if (marker === 0x60 /* ` */) {
//         if (params.indexOf(String.fromCharCode(marker)) >= 0) {
//             return false;
//         }
//     }

//     // Since start is found, we can report success here in validation mode
//     if (silent) { return true; }

//     // search end of block
//     nextLine = startLine;

//     for (; ;) {
//         nextLine++;
//         if (nextLine >= endLine) {
//             // unclosed block should be autoclosed by end of document.
//             // also block seems to be autoclosed by end of parent
//             break;
//         }

//         pos = mem = state.cs_line_start[nextLine] + state.tShift[nextLine];
//         max = state.eMarks[nextLine];

//         if (pos < max && state.sCount[nextLine] < state.block_indent) {
//             // non-empty line with negative indent should stop the list:
//             // - ```
//             //  test
//             break;
//         }

//         if (state.src.charCodeAt(pos) !== marker) { continue; }

//         if (state.sCount[nextLine] - state.block_indent >= 4) {
//             // closing fence should be indented less than 4 spaces
//             continue;
//         }

//         pos = state.skipChars(pos, marker);

//         // closing code fence must be at least as long as the opening one
//         if (pos - mem < len) { continue; }

//         // make sure tail has spaces only
//         pos = state.skipSpaces(pos);

//         if (pos < max) { continue; }

//         haveEndMarker = true;
//         // found!
//         break;
//     }

//     // If a fence has heading spaces, they should be removed from its inner block
//     len = state.sCount[startLine];

//     state.line_index = nextLine + (haveEndMarker ? 1 : 0);

//     token = state.push('fence', 'code', 0);
//     token.info = params;
//     token.content = state.getLines(startLine + 1, nextLine, len, true);
//     token.markup = markup;
//     token.map = [startLine, state.line_index];

//     return true;
// };


// export default fence