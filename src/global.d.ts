//
// Global type defs
//
declare type int = number

type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}
