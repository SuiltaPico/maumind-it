import { nanoid } from "nanoid";
import Node from "./Node";

export interface NodeID {
  /** 数据在当前载体的 id。 */
  cur_id: string,
  /** 数据一开始的 id，直接使用可能会导致冲突。 */
  readonly raw_id: string,
  /** 是否是冲突的 ID。 */
  conflicted: boolean
}

export interface WithID {
  id: NodeID | undefined
}

export const default_ID_length = 16

export const default_NodeIDManager = create_IDManager<Node>()

export function create_IDManager<T extends WithID>(option?: {
  id_length?: number,
}) {
  const _option = {
    id_length: default_ID_length,
    ...option
  }

  let id_map: { [key: string]: T } = {}

  function generate_available_raw_id(): string {
    let raw_id = nanoid(_option.id_length)
    if (id_map.hasOwnProperty(raw_id)) {
      return generate_available_raw_id()
    }
    return raw_id
  }

  function load(id: NodeID, item: T) {
    if (id_map.hasOwnProperty(id.raw_id)) {
      id.conflicted = true
      id.cur_id = generate_available_raw_id()
    }

    id_map[id.cur_id] = item
  }

  function create_ID(raw_id: string) {
    return {
      raw_id,
      cur_id: raw_id,
      conflicted: false
    }
  }

  return {
    load_item(id: NodeID, item: T) {
      load(id, item)
    },

    load_items(items: [NodeID, T][]) {
      for (const [id, target] of items) {
        load(id, target)
      }
    },

    replace_map(map_like: { [key: string]: T }) {
      id_map = map_like
    },

    /** 自动生成 ID ，将新的 ID 装载到 `target` 上，并将 `target` 加入内部的 `id_map` */
    insert<U extends { id: NodeID | undefined } & T>(target: U) {
      let id = create_ID(generate_available_raw_id())
      target.id = id
      load(id, target)
      return target
    },

    get(id: NodeID | string) {
      return id_map[typeof id === "object" ? id.cur_id : id]
    },

    delete(id: NodeID | string) {
      delete id_map[typeof id === "object" ? id.cur_id : id]
    },
  }
}