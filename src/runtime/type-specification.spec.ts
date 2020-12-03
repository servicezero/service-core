import {
  IClassSpec,
  ITypeDefArr,
  ITypeDefClass,
  ITypeDefUnion,
  Serializer,
  Typ,
  asEnum,
  getOrCreateClassDef,
  getTypeDefForPath,
  isCtorSchema,
} from "./type-specification"

// eslint-disable-next-line
namespace EnumA{ export declare const __enum: EnumA }
enum EnumA{
  One = 0,
  Two = 1,
}
enum EnumB{
  One = "One 1",
  Two = "Two 2",
  None = "None",
}
enum EnumC{
  A = "A",
  B = "B",
}

class LiteralTypesModel{
  static readonly class: IClassSpec<LiteralTypesModel> = {
    int:    [ Typ.EnumLiteral, [ 0, 1, 2 ] ],
    intOpt: [ true, Typ.EnumLiteral, [ 0n, 1n, 2n ] ],
    str:    [ Typ.EnumLiteral, [ "v1", "v2", "v3" ] ],
    strOpt: [ true, Typ.EnumLiteral, [ "v1", "v2", "v3" ] ],
  } as any
  constructor( public str: "v1" | "v2" | "v3",
               public int: 0 | 1 | 2,
               public strOpt?: "v1" | "v2" | "v3",
               public intOpt?: 0n | 1n | 2n,
  ){}
}

class SmallModel{
  static readonly class: IClassSpec<SmallModel> = { int: Typ.Int, str: Typ.Str }
  constructor( public str: string, public int: number ){}
}
class FullModel{
  static readonly class: IClassSpec<FullModel> = {
    arr:        [ Typ.Arr, Typ.Str ],
    arrOpt:     [ true, Typ.Arr, [ true, Typ.Str ] ],
    bign:       Typ.BigInt,
    bignOpt:    [ true, Typ.BigInt ],
    bool:       Typ.Bool,
    boolOpt:    [ true, Typ.Bool ],
    buff:       Typ.Buff,
    buffOpt:    [ true, Typ.Buff ],
    cls:        SmallModel,
    clsOpt:     [ true, SmallModel ],
    date:       Typ.Date,
    dateOpt:    [ true, Typ.Date ],
    enumNum:    [ Typ.Enum, EnumA ],
    enumNumOpt: [ true, Typ.Enum, EnumA ],
    enumStr:    [ Typ.Enum, asEnum(EnumB), EnumB.None ],
    enumStrOpt: [ true, Typ.Enum, EnumC ],
    float:      Typ.Float,
    floatOpt:   [ true, Typ.Float ],
    int:        Typ.Int,
    intOpt:     [ true, Typ.Int ],
    map:        [ Typ.Map, Typ.Float, Typ.Str ],
    mapOpt:     [ true, Typ.Map, Typ.Float, [ true, Typ.Str ] ],
    set:        [ Typ.Set, Typ.Int ],
    setOpt:     [ true, Typ.Set, [ true, Typ.Int ] ],
    str:        Typ.Str,
    strOpt:     [ true, Typ.Str ],
    uni:        [ Typ.Union, Typ.Str, Typ.Int, [ Typ.Arr, Typ.Str ], SmallModel ],
    uniOpt:     [ true, Typ.Union, Typ.Str, Typ.Int ],
  } as any

  constructor(
    public str: string,
    public int: number,
    public float: number,
    public bign: bigint,
    public bool: boolean,
    public date: Date,
    public buff: Buffer,
    public arr: string[],
    public set: Set<number>,
    public map: Map<number, string>,
    public enumNum: EnumA,
    public enumStr: EnumB,
    public cls: SmallModel,
    public uni: SmallModel | string[] | number | string,
    // optionals
    public strOpt: string | undefined,
    public intOpt?: number,
    public floatOpt?: number,
    public bignOpt?: bigint,
    public boolOpt?: boolean,
    public dateOpt?: Date,
    public buffOpt?: Buffer,
    public arrOpt?: (string | undefined)[],
    public setOpt?: Set<(number | undefined)>,
    public mapOpt?: Map<number, (string | undefined)>,
    public enumNumOpt?: EnumA,
    public enumStrOpt?: EnumC,
    public clsOpt?: SmallModel,
    public uniOpt?: number | string,
  ){}
}

class PathNestedSerialization{
  static readonly class: IClassSpec<PathNestedSerialization> = {
    "another,<>com[pl]ex.pr'o(p>": Typ.Str,
  }
  "another,<>com[pl]ex.pr'o(p>": string
}

class PathSerialization{
  static readonly class: IClassSpec<PathSerialization> = {
    map:                    [ Typ.Map, Typ.Float, Typ.Str ],
    nested:                 PathNestedSerialization,
    "some,complex.pro()p>": Typ.Str,
  }
  nested!: PathNestedSerialization
  "some,complex.pro()p>": string

  constructor(
    public map: Map<number, string>,
  ){}
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
  static readonly class: IClassSpec<UnionClasses> = { uni: [ Typ.Union, Typ.Int, Typ.Str, [ Typ.Arr, Typ.Str ], UnionClassB, UnionClassA, [ Typ.Map, Typ.Str, Typ.Str ] ] } as any
  constructor(public uni: Map<string, string> | string[] | UnionClassA | UnionClassB | number | string){}
}

const fullModelSpec = getOrCreateClassDef(FullModel)
const literalsSpec = getOrCreateClassDef(LiteralTypesModel)
const pathSpec = getOrCreateClassDef(PathSerialization)
const unionSpec = getOrCreateClassDef(UnionClasses)

it("is ctor schema class", () => {
  expect(isCtorSchema(class {
    static class = {}
  })).toBeTruthy()
  expect(isCtorSchema(class Foo{
    static class = {}
  })).toBeTruthy()
  expect(isCtorSchema(class{})).toBeFalsy()
  expect(isCtorSchema(function(cool = 10){
    // ignore
  })).toBeFalsy()
  expect(isCtorSchema(() => {
    // ignore
  })).toBeFalsy()
})

it("specification to type definition primitive", () => {
  expect(fullModelSpec.propertiesByName["str"]).toEqual({ name: "str", required: true, type: Typ.Str })
  expect(fullModelSpec.propertiesByName["int"]).toEqual({ name: "int", required: true, type: Typ.Int })
  expect(fullModelSpec.propertiesByName["float"]).toEqual({ name: "float", required: true, type: Typ.Float })
  expect(fullModelSpec.propertiesByName["bign"]).toEqual({ name: "bign", required: true, type: Typ.BigInt })
  expect(fullModelSpec.propertiesByName["bool"]).toEqual({ name: "bool", required: true, type: Typ.Bool })
  expect(fullModelSpec.propertiesByName["date"]).toEqual({ name: "date", required: true, type: Typ.Date })
  expect(fullModelSpec.propertiesByName["buff"]).toEqual({ name: "buff", required: true, type: Typ.Buff })
})

it("specification to type definition primitive or undefined", () => {
  expect(fullModelSpec.propertiesByName["strOpt"]).toEqual({ name: "strOpt", required: false, type: Typ.Str })
  expect(fullModelSpec.propertiesByName["intOpt"]).toEqual({ name: "intOpt", required: false, type: Typ.Int })
  expect(fullModelSpec.propertiesByName["floatOpt"]).toEqual({ name: "floatOpt", required: false, type: Typ.Float })
  expect(fullModelSpec.propertiesByName["bignOpt"]).toEqual({ name: "bignOpt", required: false, type: Typ.BigInt })
  expect(fullModelSpec.propertiesByName["boolOpt"]).toEqual({ name: "boolOpt", required: false, type: Typ.Bool })
  expect(fullModelSpec.propertiesByName["dateOpt"]).toEqual({ name: "dateOpt", required: false, type: Typ.Date })
  expect(fullModelSpec.propertiesByName["buffOpt"]).toEqual({ name: "buffOpt", required: false, type: Typ.Buff })
})

it("specification to type definition literal types", () => {
  expect(literalsSpec.propertiesByName["str"]).toEqual({
    keys: new Map([
      [ "v1", "v1" ],
      [ "v2", "v2" ],
      [ "v3", "v3" ],
    ]),
    name:           "str",
    required:       true,
    type:           Typ.EnumLiteral,
    unmatchedValue: "v1",
    vals:           new Map([
      [ "v1", "v1" ],
      [ "v2", "v2" ],
      [ "v3", "v3" ],
    ]),
  })
  expect(literalsSpec.propertiesByName["int"]).toEqual({
    keys: new Map([
      [ "0", 0 ],
      [ "1", 1 ],
      [ "2", 2 ],
    ]),
    name:           "int",
    required:       true,
    type:           Typ.EnumLiteral,
    unmatchedValue: 0,
    vals:           new Map([
      [ 0, "0" ],
      [ 1, "1" ],
      [ 2, "2" ],
    ]),
  })
  expect(literalsSpec.propertiesByName["intOpt"]).toEqual({
    keys: new Map([
      [ "0n", 0n ],
      [ "1n", 1n ],
      [ "2n", 2n ],
    ]),
    name:           "intOpt",
    required:       false,
    type:           Typ.EnumLiteral,
    unmatchedValue: 0n,
    vals:           new Map([
      [ 0n, "0n" ],
      [ 1n, "1n" ],
      [ 2n, "2n" ],
    ]),
  })
})

it("specification to type definition enum", () => {
  expect(fullModelSpec.propertiesByName["enumNum"]).toEqual({
    enum: EnumA,
    keys: new Map([
      [ "One", EnumA.One ],
      [ "Two", EnumA.Two ],
    ]),
    name:           "enumNum",
    required:       true,
    type:           Typ.Enum,
    unmatchedValue: EnumA.One,
    vals:           new Map([
      [ EnumA.One, "One" ],
      [ EnumA.Two, "Two" ],
    ]),
  })
  expect(fullModelSpec.propertiesByName["enumStr"]).toEqual({
    enum: EnumB,
    keys: new Map([
      [ "One", EnumB.One ],
      [ "Two", EnumB.Two ],
      [ "None", EnumB.None ],
    ]),
    name:           "enumStr",
    required:       true,
    type:           Typ.Enum,
    unmatchedValue: EnumB.None,
    vals:           new Map([
      [ EnumB.One, "One" ],
      [ EnumB.Two, "Two" ],
      [ EnumB.None, "None" ],
    ]),
  })
  expect(fullModelSpec.propertiesByName["enumStrOpt"]).toEqual({
    enum: EnumC,
    keys: new Map([
      [ "A", EnumC.A ],
      [ "B", EnumC.B ],
    ]),
    name:           "enumStrOpt",
    required:       false,
    type:           Typ.Enum,
    unmatchedValue: EnumC.A,
    vals:           new Map([
      [ EnumC.A, "A" ],
      [ EnumC.B, "B" ],
    ]),
  })
})


it("specification to type definition union", () => {
  expect(fullModelSpec.propertiesByName["uni"]).toEqual(expect.objectContaining({
    name:     "uni",
    required: true,
    type:     Typ.Union,
    values:   {
      [Typ.Str]:  expect.objectContaining({ required: true, type: Typ.Str }),
      [Typ.Int]:  expect.objectContaining({ required: true, type: Typ.Int }),
      [Typ.Arr]:  expect.objectContaining({ required: true, serializer: Serializer.Simple, type: Typ.Arr, valType: { required: true, type: Typ.Str } }),
      SmallModel: expect.objectContaining({ ctor: SmallModel, required: true, type: Typ.Class, typeName: "SmallModel" }),
    },
  }))
})

it("specification to type definition union or undefined", () => {
  expect(fullModelSpec.propertiesByName["uniOpt"]).toEqual(expect.objectContaining({
    name:     "uniOpt",
    required: false,
    type:     Typ.Union,
    values:   {
      [Typ.Str]: { required: true, type: Typ.Str },
      [Typ.Int]: { required: true, type: Typ.Int },
    },
  }))
})

it("specification to type definition array / set", () => {
  expect(fullModelSpec.propertiesByName["arr"]).toEqual({ name: "arr", required: true, serializer: Serializer.Simple, type: Typ.Arr, typeRegistry: new Map(), valType: { required: true, type: Typ.Str } })
  expect(fullModelSpec.propertiesByName["set"]).toEqual({ name: "set", required: true, serializer: Serializer.Simple, type: Typ.Set, typeRegistry: new Map(), valType: { required: true, type: Typ.Int } })
})

it("specification to type definition array / set or undefined", () => {
  expect(fullModelSpec.propertiesByName["arrOpt"]).toEqual({ name: "arrOpt", required: false, serializer: Serializer.Simple, type: Typ.Arr, typeRegistry: new Map(), valType: { required: false, type: Typ.Str } })
  expect(fullModelSpec.propertiesByName["setOpt"]).toEqual({ name: "setOpt", required: false, serializer: Serializer.Simple, type: Typ.Set, typeRegistry: new Map(), valType: { required: false, type: Typ.Int } })
})

it("specification to type definition map", () => {
  expect(fullModelSpec.propertiesByName["map"]).toEqual({
    keyType:      { required: true, type: Typ.Float },
    name:         "map",
    required:     true,
    serializer:   Serializer.Simple,
    type:         Typ.Map,
    typeRegistry: new Map(),
    valType:      { required: true, type: Typ.Str },
  })
})

it("specification to type definition map or undefined", () => {
  expect(fullModelSpec.propertiesByName["mapOpt"]).toEqual({
    keyType:      { required: true, type: Typ.Float },
    name:         "mapOpt",
    required:     false,
    serializer:   Serializer.Simple,
    type:         Typ.Map,
    typeRegistry: new Map(),
    valType:      { required: false, type: Typ.Str },
  })
})

it("get type definition for root path", () => {
  expect(getTypeDefForPath(fullModelSpec, "")).toBe(fullModelSpec)
})

it("get type definition for nested path", () => {
  expect(getTypeDefForPath(fullModelSpec, "str")).toBe(fullModelSpec.propertiesByName["str"])
  expect(getTypeDefForPath(fullModelSpec, "int")).toBe(fullModelSpec.propertiesByName["int"])
  expect(getTypeDefForPath(fullModelSpec, "arr[1]")).toBe((fullModelSpec.propertiesByName["arr"] as ITypeDefArr).valType)
  expect(getTypeDefForPath(fullModelSpec, "cls['str']")).toBe((fullModelSpec.propertiesByName["cls"] as ITypeDefClass).propertiesByName["str"])
  expect(getTypeDefForPath(fullModelSpec, "cls.str")).toBe((fullModelSpec.propertiesByName["cls"] as ITypeDefClass).propertiesByName["str"])
})

it("get type definition for nested path with complex property name", () => {
  expect(getTypeDefForPath(pathSpec, "['some,complex.pro()p>']")).toBe(pathSpec.propertiesByName["some,complex.pro()p>"])
  expect(getTypeDefForPath(pathSpec, "nested['another,<>com[pl]ex.pr'o(p>']")).toBe((pathSpec.propertiesByName["nested"] as ITypeDefClass).propertiesByName["another,<>com[pl]ex.pr'o(p>"])
})

it("get type definition for nested path with union type", () => {
  expect(getTypeDefForPath(unionSpec, "uni")).toBe(unionSpec.propertiesByName["uni"])
})

it("get type definition for nested path inside union with array", () => {
  expect(getTypeDefForPath(unionSpec, "uni[1]")).toBe((unionSpec.propertiesByName["uni"] as ITypeDefUnion).values.Arr?.valType)
})

it("get type definition for nested path inside union with class", () => {
  expect(getTypeDefForPath(unionSpec, "uni.foo")).toBe((unionSpec.propertiesByName["uni"] as ITypeDefUnion).values[UnionClassB.name].propertiesByName["foo"])
  expect(getTypeDefForPath(unionSpec, "uni.bar")).toBe((unionSpec.propertiesByName["uni"] as ITypeDefUnion).values[UnionClassA.name].propertiesByName["bar"])
})

it("get type definition for nested path inside union with map", () => {
  expect(getTypeDefForPath(unionSpec, "uni['something']")).toBe((unionSpec.propertiesByName["uni"] as ITypeDefUnion).values.Map?.valType)
})
