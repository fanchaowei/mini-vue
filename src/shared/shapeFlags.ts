/**
 * 通过二进制的形式来记录对象的信息
 */
export const enum ShapeFlags {
  ELEMENT = 1, //0001，是否为 element 虚拟节点对象
  STATEFUL_COMPONENT = 1 << 1, //0010，是否为组件虚拟节点对象
  TEXT_CHILDREN = 1 << 2, //0100，对象的children是否为字符串
  ARRATY_CHILDREN = 1 << 3, //1000，对象的children是否为数组
  SLOT_CHILDREN = 1 << 4, //10000, 对象的children是否为插槽
}
