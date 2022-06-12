import codes from "./codes";



/**
 * `"\t"` `" "`
 */
export default function (code: number): code is (typeof codes.HT | typeof codes.Space) {
  switch (code) {
    case codes.HT:
    case codes.Space:
      return true;
  }
  return false;
}