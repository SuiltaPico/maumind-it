import { map } from "lodash"

export default function get_available_key(obj: object) {
  return Object.getOwnPropertyNames(obj).filter((v) => {
    // @ts-ignore
    return obj[v] !== undefined
  })[0]
}

export function get_available_keys(
  obj: object,
  filter?: ((name: string) => boolean)
) {
  return Object.getOwnPropertyNames(obj).filter((v) => {
    if (filter && !filter(v)) {
      return false
    }
    // @ts-ignore
    return obj[v] !== undefined
  })
}