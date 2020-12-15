import {
  deserializeTypeFromJson,
  getInheritanceClassNameFromType,
  serializeTypeToJson,
} from "./type-serializer"
import {
  IClassSpec, Serializer, Typ, asEnum,
} from "./type-specification"

enum EnumA{
  One = 0,
  Two = 1,
}
enum EnumB{
  One = "Two",
  Two = "One",
  Three = "3",
  None = "NoneVal",
}

class SmallModel{
  static readonly class: IClassSpec<SmallModel> = { int: Typ.Int, str: Typ.Str }
  constructor( public str: string, public int: number ){}
}

class ModelFull{
  static class: IClassSpec<ModelFull> = {
    arr:       [ Typ.Arr, Typ.Str ],
    bigi:      Typ.BigInt,
    bool:      Typ.Bool,
    buff:      Typ.Buff,
    cls:       SmallModel,
    date:      Typ.Date,
    enumNum:   [ Typ.Enum, asEnum(EnumA) ],
    enumStr:   [ Typ.Enum, asEnum(EnumB), EnumB.None ],
    intLit:    [ Typ.EnumLiteral, [ 0, 1, 2 ] ],
    mapFloat:  [ Typ.Map, Typ.Float, Typ.Int ],
    mapInt:    [ Typ.Map, Typ.Int, Typ.Float ],
    mapStr:    [ Typ.Map, Typ.Str, Typ.Str ],
    numFloat:  Typ.Float,
    numInt:    Typ.Int,
    oarr:      [ true, Typ.Arr, Typ.Str ],
    obigi:     [ true, Typ.BigInt ],
    obool:     [ true, Typ.Bool ],
    obuff:     [ true, Typ.Buff ],
    ocls:      [ true, SmallModel ],
    odate:     [ true, Typ.Date ],
    oenumNum:  [ true, Typ.Enum, asEnum(EnumA) ],
    oenumStr:  [ true, Typ.Enum, asEnum(EnumB), EnumB.None ],
    ointLit:   [ true, Typ.EnumLiteral, [ 0n, 1n, 2n ] ],
    omapFloat: [ true, Typ.Map, Typ.Float, Typ.Int ],
    omapInt:   [ true, Typ.Map, Typ.Int, Typ.Float ],
    omapStr:   [ true, Typ.Map, Typ.Str, Typ.Str ],
    onumFloat: [ true, Typ.Float ],
    onumInt:   [ true, Typ.Int ],
    oset:      [ true, Typ.Set, Typ.Float ],
    ostr:      [ true, Typ.Str ],
    ostrLit:   [ true, Typ.EnumLiteral, [ "v1", "v2", "v3" ] ],
    ouni:      [ true, Typ.Union, Typ.Str, Typ.Int, [ Typ.Arr, Typ.Str ], Typ.BigInt, SmallModel, Typ.Date ],
    set:       [ Typ.Set, Typ.Float ],
    str:       Typ.Str,
    strLit:    [ Typ.EnumLiteral, [ "v1", "v2", "v3" ] ],
    uni:       [ Typ.Union, Typ.Str, Typ.Int, [ Typ.Arr, Typ.Str ], Typ.BigInt, Typ.Date, SmallModel ],
  } as any

  constructor(
    public str: string,
    public numInt: number,
    public numFloat: number,
    public bool: boolean,
    public bigi: bigint,
    public buff: Buffer,
    public date: Date,
    public arr: string[],
    public set: Set<number>,
    public strLit: "v1" | "v2" | "v3",
    public intLit: 0 | 1 | 2,
    public enumNum: EnumA,
    public enumStr: EnumB,
    public mapStr: Map<string, string>,
    public mapInt: Map<number, number>,
    public mapFloat: Map<number, number>,
    public cls: SmallModel,
    public uni: Date | SmallModel | string[] | bigint | number | string,

    public ostr?: string,
    public onumInt?: number,
    public onumFloat?: number,
    public obool?: boolean,
    public obigi?: bigint,
    public obuff?: Buffer,
    public odate?: Date,
    public oarr?: string[],
    public oset?: Set<number>,
    public ostrLit?: "v1" | "v2" | "v3",
    public ointLit?: 0n | 1n | 2n,
    public oenumNum?: EnumA,
    public oenumStr?: EnumB,
    public omapStr?: Map<string, string>,
    public omapInt?: Map<number, number>,
    public omapFloat?: Map<number, number>,
    public ocls?: SmallModel,
    public ouni?: Date | SmallModel | string[] | bigint | number | string,
  ){}
}

class ModelWithDefaults{
  static class: IClassSpec<ModelWithDefaults> = {
    arr:      [ Typ.Arr, Typ.Str ],
    bigi:     Typ.BigInt,
    bool:     Typ.Bool,
    cls:      SmallModel,
    date:     Typ.Date,
    enumNum:  [ Typ.Enum, asEnum(EnumA) ],
    enumStr:  [ Typ.Enum, asEnum(EnumB), EnumB.None ],
    mapStr:   [ Typ.Map, Typ.Str, Typ.Str ],
    numFloat: Typ.Float,
    numInt:   Typ.Int,
    set:      [ Typ.Set, Typ.Float ],
    str:      Typ.Str,
    strLit:   [ Typ.EnumLiteral, [ "v1", "v2", "v3" ] ],
    uni:      [ Typ.Union, Typ.Str, Typ.Int ],
  } as any

  constructor(
    public str: string = "strA",
    public numInt: number = 23,
    public numFloat: number = 12.34,
    public bool: boolean = true,
    public bigi: bigint = 13n,
    public date: Date = new Date("2021-03-04T01:02:03.000Z"),
    public arr: string[] = [ "a", "b" ],
    public set: Set<number> = new Set([ 2, 4 ]),
    public strLit: "v1" | "v2" | "v3" = "v3",
    public enumNum: EnumA = EnumA.Two,
    public enumStr: EnumB = EnumB.Two,
    public mapStr: Map<string, string> = new Map([ [ "a", "v1" ], [ "b", "v2" ] ]),
    public cls: SmallModel = new SmallModel("v5", 34),
    public uni: number | string = 43,
  ){}
}

class Iterables{
  static class: IClassSpec<Iterables> = {
    mapBigi:  [ Typ.Map, Typ.BigInt, Typ.Str ],
    mapBool:  [ Typ.Map, Typ.Bool, Typ.Str ],
    mapDate:  [ Typ.Map, Typ.Date, Typ.Str ],
    mapFloat: [ Typ.Map, Typ.Float, Typ.Str ],
    mapInt:   [ Typ.Map, Typ.Int, Typ.Str ],
    setBigi:  [ Typ.Set, Typ.BigInt ],
    setBool:  [ Typ.Set, Typ.Bool ],
    setDate:  [ Typ.Set, Typ.Date ],
    setFloat: [ Typ.Set, Typ.Float ],
    setInt:   [ Typ.Set, Typ.Int ],
  }
  constructor(
    public setInt: Set<number>,
    public setFloat: Set<number>,
    public setBigi: Set<bigint>,
    public setBool: Set<boolean>,
    public setDate: Set<Date>,
    public mapInt: Map<number, string>,
    public mapFloat: Map<number, string>,
    public mapBigi: Map<bigint, string>,
    public mapBool: Map<boolean, string>,
    public mapDate: Map<Date, string>,
  ){}
}

class ComplexProps{
  static class: IClassSpec<ComplexProps> = {
    arr:           [ Typ.Arr, Typ.Str ],
    arrJson:       [ Typ.Arr, Typ.Str, Serializer.Json ],
    map:           [ Typ.Map, Typ.Str, Typ.Str ],
    mapJson:       [ Typ.Map, Typ.Str, Typ.Str, Serializer.Json ],
    "nested.prop": Typ.Str,
  }
  "nested.prop": string

  constructor(
    nestedProp: string,
    public map: Map<string, string>,
    public mapJson: Map<string, string>,
    public arr: string[],
    public arrJson: string[],
  ){
    this["nested.prop"] = nestedProp
  }
}

class UnionClassB{
  static readonly class: IClassSpec<UnionClassB> = { foo: Typ.Str }
  constructor( public foo: string ){}
}

class UnionClassA{
  static readonly class: IClassSpec<UnionClassA> = { bar: Typ.Float }
  constructor( public bar: number ){}
}

class UnionClasses{
  static readonly class: IClassSpec<UnionClasses> = { uni: [ Typ.Union, UnionClassB, UnionClassA ] } as any
  constructor(public uni: UnionClassA | UnionClassB){}
}

const value = new ModelFull(
  "v1",
  12,
  12.34,
  true,
  13n,
  Buffer.from("foo"),
  new Date("2021-01-02T03:04:05.789Z"),
  [ "a", "b" ],
  new Set([ 12.12, 4, 6.6 ]),
  "v1",
  0,
  EnumA.One,
  EnumB.One,
  new Map([ [ "a", "v1" ], [ "b", "v2" ] ]),
  new Map([ [ 2, 3.3 ], [ 12, 13.13 ] ]),
  new Map([ [ 2.2, 3 ], [ 12.12, 13 ] ]),
  new SmallModel("s1", 10),
  "s2",

  "v2",
  13,
  13.34,
  false,
  14n,
  Buffer.from("bar"),
  new Date("2020-01-02T03:04:05.789Z"),
  [ "c", "d" ],
  new Set([ 13.12, 5, 7.6 ]),
  "v2",
  1n,
  EnumA.Two,
  EnumB.Two,
  new Map([ [ "c", "v3" ], [ "d", "v4" ] ]),
  new Map([ [ 4, 5.5 ], [ 14, 15.15 ] ]),
  new Map([ [ 4.4, 5 ], [ 16.16, 17 ] ]),
  new SmallModel("s2", 20),
  "s3",
)
const defaultValue = new ModelFull(
  "",
  0,
  0,
  false,
  0n,
  Buffer.alloc(0),
  new Date(0),
  [],
  new Set(),
  "v1",
  0,
  EnumA.One,
  EnumB.None,
  new Map(),
  new Map(),
  new Map(),
  new SmallModel("", 0),
  "",

  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
)

const d1 = new Date("2021-01-02T03:04:05.678Z")
const d2 = new Date("2022-01-02T03:04:05.678Z")

const iters = new Iterables(
  new Set([ 1, -2 ]),
  new Set([ 1, 1.5, -2, -3.5 ]),
  new Set([ 1n, 12n ]),
  new Set([ true, false ]),
  new Set([ d1, d2 ]),
  new Map([ [ 1, "v1" ], [ -2, "v2" ] ]),
  new Map([ [ 1, "v1" ], [ 1.5, "v2" ], [ -2, "v3" ], [ -3.5, "v4" ] ]),
  new Map([ [ 1n, "v1" ], [ 12n, "v2" ] ]),
  new Map([ [ true, "v1" ], [ false, "v2" ] ]),
  new Map([ [ d1, "v1" ], [ d2, "v2" ] ]),
)

it("serializes / deserializes json model on root path", () => {
  const serialized = serializeTypeToJson(ModelFull, value)
  expect(deserializeTypeFromJson(ModelFull, JSON.stringify(serialized))).toEqual(value)
})

it("serializes / deserializes json sets and maps", () => {
  const serialized = serializeTypeToJson(Iterables, iters)
  expect(deserializeTypeFromJson(Iterables, JSON.stringify(serialized))).toEqual(iters)
})

it("throws when cannot find type definition", () => {
  expect(() => {
    serializeTypeToJson(ModelFull, {}, "doesnotexist")
  }).toThrow()
})

it("getInheritanceClassNameFromType", () => {
  expect(getInheritanceClassNameFromType("Some.Domain.Models.UnionClassA, Some.Domain.Models"))
    .toEqual({
      className:       "Some.Domain.Models.UnionClassA",
      classNameSimple: "UnionClassA",
      packageName:     "Some.Domain.Models",
      type:            "Some.Domain.Models.UnionClassA, Some.Domain.Models",
    })
  expect(getInheritanceClassNameFromType("UnionClassA, Models"))
    .toEqual({
      className:       "UnionClassA",
      classNameSimple: "UnionClassA",
      packageName:     "Models",
      type:            "UnionClassA, Models",
    })
  expect(getInheritanceClassNameFromType("UnionClassA"))
    .toEqual({
      className:       "UnionClassA",
      classNameSimple: "UnionClassA",
      packageName:     "",
      type:            "UnionClassA",
    })
})

it("deserializes union types when c# defined class and package", () => {
  const deserialized = deserializeTypeFromJson(UnionClasses, JSON.stringify({
    uni: {
      $type: "Some.Domain.Models.UnionClassA, Some.Domain.Models",
      bar:   24,
    },
  }))
  expect(deserialized).toEqual(new UnionClasses(new UnionClassA(24)))

  const deserialized2 = deserializeTypeFromJson(UnionClasses, JSON.stringify({
    uni: {
      $type: "Some.Domain.Models.UnionClassB, Some.Domain.Models",
      foo:   "v1",
    },
  }))
  expect(deserialized2).toEqual(new UnionClasses(new UnionClassB("v1")))
})

it("deserializes when optional values should be defaulted", () => {
  const deserialized = deserializeTypeFromJson(ModelFull, JSON.stringify({}))
  expect(deserialized).toEqual(defaultValue)
})

it("deserializes when model has default initialised values", () => {
  const deserialized = deserializeTypeFromJson(ModelWithDefaults, JSON.stringify({}))
  expect(deserialized).toEqual(new ModelWithDefaults())
})

it("deserializes when model has default initialised values and defined values", () => {
  const deserialized = deserializeTypeFromJson(ModelWithDefaults, JSON.stringify({
    arr:  [ "c" ],
    bigi: "8",
    bool: false,
    cls:  {
      int: 2,
      str: "a",
    },
    date:    "2020-03-04T01:02:03.000Z",
    enumNum: EnumA.One,
    enumStr: EnumB.One,
    mapStr:  {
      foo: "bar",
    },
    numFloat: 10.1,
    numInt:   0,
    set:      [ 4 ],
    str:      "strB",
    strLit:   "v2",
    uni:      "hi",
  }))
  expect(deserialized).toEqual(new ModelWithDefaults(
    "strB",
    0,
    10.1,
    false,
    8n,
    new Date("2020-03-04T01:02:03.000Z"),
    [ "c" ],
    new Set([ 4 ]),
    "v2",
    EnumA.One,
    EnumB.One,
    new Map([ [ "foo", "bar" ] ]),
    new SmallModel("a", 2),
    "hi",
  ))
})

it("serializes / deserializes when complex paths and values", () => {
  const map = new Map([
    [ "some.val,comma", "cool,efe.ee,foo" ],
    [ "foo,bar,ee", "v1,er.e3,tt" ],
  ])
  const arr = [ "foo,bar,ee", "v1,er.e3,tt" ]

  const val = new ComplexProps("v1", map, map, arr, arr)
  const serialized = serializeTypeToJson(ComplexProps, val)
  expect(deserializeTypeFromJson(ComplexProps, JSON.parse(JSON.stringify(serialized)))).toEqual(val)
})

const date1Ts = "2020-01-02T03:04:05.789Z"
const date1 = new Date(date1Ts)
const expDate = {
  unixms: date1.getTime(),
  value:  date1Ts,
}
const date0 = new Date(0)
const zeroDate = {
  unixms: date0.getTime(),
  value:  date0.toISOString(),
}

const serializeData = {
  arr:                 [ "string[]", [ "a", "b" ], [ "a", "b" ], [ "a", undefined ], [ "a", "" ], [ 1, 2 ], [ "1", "2" ], 23, [] ],
  "arr[1]":            [ "array field", "s1", "s1", 12, "12", undefined, "" ],
  bigi:                [ "bigint", 14n, "14", 4.5, "0", 4, "4", "ee", "0", "12", "12", undefined, "0" ],
  bool:                [ "boolean", true, true, "true", true, 1, true, "1", true, false, false, "false", false, undefined, false ],
  buff:                [ "buffer", Buffer.from("foo"), "Zm9v", "efer", "", undefined, "" ],
  cls:                 [ "class", new SmallModel("s1", 12.34), { int: 12, str: "s1" }, { int: "12.45", str: 12 }, { int: 12, str: "12" }, undefined, { int: 0, str: "" } ],
  "cls.int":           [ "class int field", "s1", 0, 12, 12, undefined, 0 ],
  "cls.str":           [ "class string field", "s1", "s1", 12, "12", undefined, "" ],
  date:                [ "date", date1, expDate, date1.getTime(), expDate, date1Ts, expDate, 12n, zeroDate, "er", zeroDate, undefined, zeroDate ],
  enumNum:             [ "number enum", EnumA.One, "One", EnumA.Two, "Two", "unknown", "One", undefined, "One" ],
  enumStr:             [ "string enum", EnumB.One, EnumB.One, EnumB.Two, EnumB.Two, "unknown", EnumB.None, undefined, EnumB.None ],
  intLit:              [ "number literal", 1, "1", 2, "2", "unknown", "0", undefined, "0" ],
  mapFloat:            [ "Map<float, int>", new Map<any, any>([ [ "12.34", "13.56" ], [ 13.11, 15.67 ], [ undefined, "d" ], [ -11.6, -34.23 ] ]), { "-11.6": -34, 0: 0, 12.34: 13, 13.11: 15 }, [], {} ],
  "mapFloat['12.34']": [ "map int value", "c", 0, "12.34", 12 ],
  mapInt:              [ "Map<int, float>", new Map<any, any>([ [ "12.34", "13.56" ], [ 13.11, 15.67 ], [ undefined, "d" ], [ -11.6, -34.23 ] ]), { "-11": -34.23, 0: 0, 12: 13.56, 13: 15.67 }, [], {} ],
  "mapInt['12.34']":   [ "map float value", "c", 0, "12.34", 12.34 ],
  mapStr:              [ "Map<string, string>", new Map<any, any>([ [ "a", "b" ], [ 12, 15 ], [ undefined, "d" ] ]), { "": "d", 12: "15", a: "b" }, undefined, {} ],
  "mapStr['c']":       [ "map string key", "c", "c" ],
  numFloat:            [ "float", 3, 3, 3.5, 3.5, -4.5, -4.5, "3", 3, "-4.5", -4.5, "ee", 0, NaN, 0, undefined, 0 ],
  numInt:              [ "int", 3, 3, 3.5, 3, -4.5, -4, "3", 3, "-4.5", -4, "ee", 0, NaN, 0, undefined, 0 ],
  oarr:                [ "optional string[]", null, undefined, undefined, undefined ],
  obigi:               [ "optional bigint", null, undefined, undefined, undefined ],
  obool:               [ "optional boolean", null, undefined, undefined, undefined ],
  obuff:               [ "optional buffer", null, undefined, undefined, undefined ],
  ocls:                [ "optional class", null, undefined, undefined, undefined ],
  odate:               [ "optional date", null, undefined, undefined, undefined ],
  oenumNum:            [ "optional number enum", null, undefined, undefined, undefined ],
  oenumStr:            [ "optional string enum", null, undefined, undefined, undefined ],
  ointLit:             [ "optional bigint literal", null, undefined, undefined, undefined, 1n, "1n", 2n, "2n" ],
  omapFloat:           [ "optional Map<float, int>", null, undefined, undefined, undefined ],
  omapInt:             [ "optional Map<int, float>", null, undefined, undefined, undefined ],
  omapStr:             [ "optional Map<string, string>", null, undefined, undefined, undefined ],
  onumFloat:           [ "optional float", null, undefined, undefined, undefined ],
  onumInt:             [ "optional int", null, undefined, undefined, undefined ],
  oset:                [ "optional Set<float>", null, undefined, undefined, undefined ],
  ostr:                [ "optional string", null, undefined, undefined, undefined ],
  ostrLit:             [ "optional string literal", null, undefined, undefined, undefined ],
  ouni:                [ "optional union", null, undefined, undefined, undefined ],
  set:                 [ "Set<float>", new Set([ "a", "b" ]), [ 0, 0 ], new Set([ 1.12, -2.5 ]), [ 1.12, -2.5 ] ],
  str:                 [ "string", 3, "3", "foobar", "foobar", undefined, "" ],
  strLit:              [ "string literal", "v2", "v2", "unknown", "v1", undefined, "v1" ],
  uni:                 [ "union",
    "s1", { _typ: Typ.Str, value: "s1" },
    12.23, { _typ: Typ.Int, value: 12 },
    13n, { _typ: Typ.BigInt, value: "13" },
    date1, { ...expDate, _typ: Typ.Date },
    [ "a", 12 ], { _typ: Typ.Arr, value: [ "a", "12" ] },
    new SmallModel("s1", 12.34), { _typ: "SmallModel", int: 12, str: "s1" },
    undefined, { _typ: Typ.Str, value: "" },
  ],
  "uni.int": [ "union class int field", "s1", 0, 12.34, 12 ],
  "uni[1]":  [ "union array value", "s1", "s1" ],
}

const deserializeData = {
  arr:                 [ "string[]", [ "a", "b" ], [ "a", "b" ], [ 1, 2 ], [ "1", "2" ], 23, [] ],
  "arr[1]":            [ "array field", "s1", "s1", 12, "12", null, "" ],
  bigi:                [ "bigint", "14", 14n, 4.5, 0n, 4, 4n, "ee", 0n, "12", 12n, null, 0n ],
  bool:                [ "boolean", true, true, "true", true, 1, true, "1", true, false, false, "false", false, null, false ],
  buff:                [ "buffer", "Zm9v", Buffer.from("foo"), "a", Buffer.from("a", "base64"), "", Buffer.alloc(0), null, Buffer.alloc(0) ],
  cls:                 [ "class", { int: 12.34, str: "s1" }, new SmallModel("s1", 12), { int: "12.45", str: 12 }, new SmallModel("12", 12), null, new SmallModel("", 0) ],
  "cls.int":           [ "class int field", "s1", 0, 12, 12, null, 0 ],
  "cls.str":           [ "class string field", "s1", "s1", 12, "12", null, "" ],
  date:                [ "date", expDate, date1, date1.getTime(), date1, date1Ts, date1, "er", date0, null, date0 ],
  enumNum:             [ "number enum", "One", EnumA.One, "Two", EnumA.Two, "twO", EnumA.Two, "unknown", EnumA.One, null, EnumA.One ],
  enumStr:             [ "string enum", "3", EnumB.Three, "Three", EnumB.Three, "One", EnumB.Two, "Two", EnumB.One, "twO", EnumB.One, "thREe", EnumB.Three, "unknown", EnumB.None, "None", EnumB.None ],
  intLit:              [ "number literal", 1, 1, "1", 1, "2", 2, "unknown", 0, null, 0 ],
  mapFloat:            [ "Map<float, int>", { "-11.6": -34.12, 12.34: "13" }, new Map<any, any>([ [ -11.6, -34 ], [ 12.34, 13 ] ]), {}, new Map() ],
  "mapFloat['12.34']": [ "map int value", "c", 0, "12.34", 12, 14, 14 ],
  mapInt:              [ "Map<int, float>", { "-11": "-34.23", 12.23: 13.56, 13: 15.67 }, new Map<any, any>([ [ 13, 15.67 ], [ 12, 13.56 ], [ -11, -34.23 ] ]), {}, new Map() ],
  "mapInt['12.34']":   [ "map float value", "c", 0, "12.34", 12.34, 13, 13 ],
  mapStr:              [ "Map<string, string>", { "": "d", 12: 15, a: "b" }, new Map<any, any>([ [ "12", "15" ], [ "a", "b" ], [ "", "d" ] ]), {}, new Map() ],
  "mapStr['c']":       [ "map string key", "c", "c" ],
  numFloat:            [ "float", 3, 3, 3.5, 3.5, -4.5, -4.5, "3", 3, "-4.5", -4.5, "ee", 0, null, 0 ],
  numInt:              [ "int", 3, 3, 3.5, 3, -4.5, -4, "3", 3, "-4.5", -4, "ee", 0, null, 0 ],
  oarr:                [ "optional string[]", null, undefined ],
  obigi:               [ "optional bigint", null, undefined ],
  obool:               [ "optional boolean", null, undefined ],
  obuff:               [ "optional buffer", null, undefined ],
  ocls:                [ "optional class", null, undefined ],
  odate:               [ "optional date", null, undefined ],
  oenumNum:            [ "optional number enum", null, undefined ],
  oenumStr:            [ "optional string enum", null, undefined ],
  ointLit:             [ "optional bigint literal", null, undefined, "1n", 1n, "2n", 2n ],
  omapFloat:           [ "optional Map<float, int>", null, undefined ],
  omapInt:             [ "optional Map<int, float>", null, undefined ],
  omapStr:             [ "optional Map<string, string>", null, undefined ],
  onumFloat:           [ "optional float", null, undefined ],
  onumInt:             [ "optional int", null, undefined ],
  oset:                [ "optional Set<float>", null, undefined ],
  ostr:                [ "optional string", null, undefined ],
  ostrLit:             [ "optional string literal", null, undefined ],
  ouni:                [ "optional union", null, undefined ],
  set:                 [ "Set<float>", [ "a", "b" ], new Set([ 0 ]), [ 1.12, -2.5 ], new Set([ 1.12, -2.5 ]) ],
  str:                 [ "string", 3, "3", "foobar", "foobar", null, "" ],
  strLit:              [ "string literal", "v2", "v2", "unknown", "v1", null, "v1" ],
  uni:                 [ "union",
    { _typ: Typ.Str, value: "s1" }, "s1",
    { _typ: Typ.Str, value: 12 }, "12",
    { _typ: Typ.Int, value: 12.23 }, 12,
    { _typ: Typ.Int, value: "12.12" }, 12,
    { _typ: Typ.BigInt, value: "13" }, 13n,
    { ...expDate, _typ: Typ.Date }, date1,
    { _typ: Typ.Arr, value: [ "a", 12 ] }, [ "a", "12" ],
    { _typ: "SmallModel", int: "12.35", str: "s1" }, new SmallModel("s1", 12),
    { _typ: "SmallModel", int: 12.35, str: "s1" }, new SmallModel("s1", 12),
    null, "",
  ],
  "uni.int": [ "union class int field", "s1", 0, 12.34, 12 ],
  "uni[1]":  [ "union array value", "s1", "s1" ],
}

const getJsonStr = (v: any) => {
  try{
    return JSON.stringify(v)
  }catch(e){
    return e?.toString() ?? ""
  }
}

//
// JSON serialize / deserialize
//
for(const [ field, checks ] of Object.entries(serializeData)){
  for(let i = 1, ii = checks.length; i < ii; i += 2){
    const v = checks[i]
    const ev = checks[i + 1]
    it(`${ checks[0] } ${ getJsonStr(v) } should serialize json to ${ getJsonStr(ev) }`, () =>
      expect(serializeTypeToJson(ModelFull, v, field)).toEqual(ev),
    )
  }
}

for(const [ field, checks ] of Object.entries(deserializeData)){
  for(let i = 1, ii = checks.length; i < ii; i += 2){
    const v = checks[i]
    const ev = checks[i + 1]
    it(`${ checks[0] } ${ getJsonStr(v) } should deserialize json to ${ getJsonStr(ev) }`, () =>
      expect(deserializeTypeFromJson(ModelFull, JSON.stringify(v), field)).toEqual(ev),
    )
  }
}
