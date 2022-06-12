import Token from "../Token"
import { NodeID } from "./NodeID"

export default interface Node {
  id: NodeID
  title: string
  meta: NodeMeta
  contents: Token[]
  children: Node[]
}

export interface NodeMeta {
  static: NodeStaticMeta
  state: {
    meta: NodeStateMeta
    token_index: number
  }[]
}

export interface NodeStaticMeta {

}

export interface NodeStateMeta {

}