import {
  deserializeTypeFromRequest,
  serializeTypeToRequest,
} from "@service-core/api/request-serializer"
import {
  IClassSpec,
  Typ,
} from "@service-core/runtime/type-specification"

enum EnumA{
  One = 0,
  Two = 1,
}
enum EnumB{
  One = "One 1",
  Two = "Two 2",
  None = "None",
}

class SmallModel{
  static readonly class: IClassSpec<SmallModel> = { int: Typ.Int, str: Typ.Str }
  constructor( public str: string, public int: number ){}
}
class ReqModel{
  static readonly class: IClassSpec<ReqModel>

  constructor(
    public str: string,
    public int: number,
    public float: number,
    public bign: bigint,
    public bool: boolean,
    public date: Date,
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
    public arrOpt?: (string | undefined)[],
  ){}
}

const date = new Date("2021-07-14T01:02:03.000Z")
const date2 = new Date("2021-08-14T01:02:03.000Z")
const model = new ReqModel(
  "v1",
  10,
  12.45,
  16n,
  true,
  date,
  [ "a", "b" ],
  new Set([ 4 ]),
  new Map([ [ 1, "v1" ], [ 3, "v3" ] ]),
  EnumA.One,
  EnumB.Two,
  new SmallModel("v4", 4),
  "v6",
  "v7",
  7,
  7.7,
  18n,
  false,
  date2,
  [ "c", undefined, "d" ],
)

describe("request serializer", () => {
  it("serializes / deserializes request", () => {
    const params = serializeTypeToRequest(model)
    expect(deserializeTypeFromRequest(ReqModel, params)).toEqual(model)
  })

  it("deserializes request with single entry for array enforces the array", () => {
    const params: any = serializeTypeToRequest(model)
    params.arr = "a,b"
    // @ts-ignore
    const expected = new ReqModel()
    Object.assign(expected, model)
    expected.arr = [ "a,b" ]
    expect(deserializeTypeFromRequest(ReqModel, params)).toEqual(expected)
  })
})
