import path from "path"
import typeSpecificationTransformer from "./typescript-transformer-type-specification"
import { compile } from "./typescript-transformer-utils"

// language=ts
const srcFileB = `
    import { IClassSpec, Typ, int } from "@kindred-bff-core/runtime/type-specification"

    export enum EnumB{
        One  = "One 1",
        Two  = "Two 2",
        None = "None",
    }

    export class CustomClassDef{
        static readonly class: IClassSpec<CustomClassDef> = {
            str: Typ.Str,
            int: Typ.Int,
        }

        constructor(public str: string, public int: number){
        }
    }

    export class SmallModel{
        constructor(public str: string, public int: number){
        }
    }

    export class BaseMergeModel{
        constructor(readonly str: string, readonly en: EnumB){
        }
    }

    export class UnionA{}
    export class UnionB{}
    export type Unions = UnionA | UnionB

    export type IStrs = "v1" | "v2" | "v3"

    export interface IModelE{
        str: IStrs
        int: 0 | 1 | -2
        type: "foobar"
        idx: 46
        bii: 22n
        readonly truthy: true
        readonly falsy: false
        readonly strOpt?: IStrs
        readonly intOpt?: 0n | 1n | -2n

        ignored(): string
        ignored2: () => string
    }

    export interface IModelF{
        str: string
        int: int
    }

    export type IModelG = Pick<IModelE, "idx" | "bii" | "strOpt">
`

// language=ts
const srcFileA = `
    import { EnumB, SmallModel, IStrs, IModelE, IModelF, IModelG, Unions, BaseMergeModel } from "@test/a"
    import { IClassSpec, int } from "@kindred-bff-core/runtime/type-specification"

    enum EnumA{
        One = 0,
        Two = 1,
    }

    enum EnumC{
        A = "A",
        B = "B",
    }

    class UnionC{}

    interface IModelD extends IModelE{
        float: number
        bign: bigint
        bool: boolean
        date: Date
        buff: Buffer
        arr: string[]
        set: Set<number>
        map: Map<number, string>
        enumNum: EnumA
        enumStr: EnumB
        cls: SmallModel
        face: IModelD
        uni: string | number | string[] | SmallModel
        uniAlias: Unions

        // optionals
        floatOpt?: number
        bignOpt?: bigint
        boolOpt?: boolean
        dateOpt?: Date
        buffOpt?: Buffer
        arrOpt?: readonly (string | undefined)[]
        setOpt?: ReadonlySet<(number | undefined)>
        mapOpt?: ReadonlyMap<int, (string | undefined)>
        enumNumOpt?: EnumA
        enumStrOpt?: EnumC
        clsOpt?: SmallModel
        uniOpt?: string | number | ReadonlyArray<string>
        uniAliasOpt?: Unions | UnionC

        method(): string
    }

    export interface SomeModelA extends IModelF, IModelG, Pick<IModelD, "enumNum" | "cls">{}
    export class SomeModelA{
        static readonly class: IClassSpec<SomeModelA>
    }

    abstract class BaseModel{
        static staticBaseStr = "er"
        static staticBaseMethod(){
            return "erg"
        }

        public baseArr: string[]
        public baseBool: boolean

        protected baseProt: string
        private basePriv: string
        abstract baseAbstract: string

        constructor(
            public baseStr: string,
            public baseInt: int,
        ){}

        get baseGetter(){
            return "erge"
        }

        baseMethod(): string{
            return "erg"
        }
    }

    class LiteralTypesModel{
        static readonly class: IClassSpec<LiteralTypesModel>

        constructor(public str: IStrs,
                    public int: 0 | 1 | -2,
                    public type: "foobar",
                    public idx: 46,
                    public bii: 22n,
                    public truthy: true,
                    public falsy: false,
                    public strOpt?: IStrs,
                    public intOpt?: 0n | 1n | -2n,
        ){
        }
    }

    export class FullModel extends BaseModel{
        static staticStr = "er"
        static staticMethod(){
            return "erg"
        }
        static readonly class: IClassSpec<FullModel>

        protected propProt: string
        private propPriv: string
        baseAbstract: string

        // optionals
        strOpt: string | undefined
        intOpt?: int
        floatOpt?: number
        bignOpt?: bigint
        public boolOpt?: boolean
        public dateOpt?: Date
        public buffOpt?: Buffer
        public arrOpt?: readonly (string | undefined)[]
        public setOpt?: ReadonlySet<(number | undefined)>
        public mapOpt?: ReadonlyMap<int, (string | undefined)>
        public enumNumOpt?: EnumA
        public enumStrOpt?: EnumC
        public clsOpt?: SmallModel
        public uniOpt?: string | number | ReadonlyArray<string>
        public uniAliasOpt?: Unions | UnionC

        anotherIgnored = () => "erg"

        get getter(){
            return "erge"
        }

        method(): string{
            return "erg"
        }

        constructor(
            public str: string,
            public int: int,
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
            public face: IModelD,
            public uni: string | number | string[] | SmallModel,
            public uniAlias: Unions,
        ){
            super("erg", 10)
        }
    }
`

// language=ts
const srcFileC = `
    import { BaseMergeModel } from "@test/a"

    export interface MergedModel extends Pick<BaseMergeModel, "str">,
                                             Partial<Pick<BaseMergeModel, "en">>{}
    export class MergedModel{
    }
`

// language=js
const srcFileAExp = `
import { SmallModel, UnionA, UnionB, EnumB } from "@test/a";
var EnumA;
(function (EnumA) {
    EnumA[EnumA["One"] = 0] = "One";
    EnumA[EnumA["Two"] = 1] = "Two";
})(EnumA || (EnumA = {}));
var EnumC;
(function (EnumC) {
    EnumC["A"] = "A";
    EnumC["B"] = "B";
})(EnumC || (EnumC = {}));
class UnionC {
}
export class SomeModelA {
    static class = {
        str: "Str",
        int: "Int",
        idx: ["EnumLiteral", [46]],
        bii: ["EnumLiteral", [22n]],
        strOpt: [true, "EnumLiteral", ["v1", "v2", "v3"]],
        enumNum: ["Enum", EnumA],
        cls: SmallModel
    };
}
class BaseModel {
    constructor(baseStr, baseInt) {
        this.baseStr = baseStr;
        this.baseInt = baseInt;
    }
    static staticBaseMethod() {
        return "erg";
    }
    get baseGetter() {
        return "erge";
    }
    baseMethod() {
        return "erg";
    }
}
BaseModel.staticBaseStr = "er";
class LiteralTypesModel {
    static class = {
        str: ["EnumLiteral", ["v1", "v2", "v3"]],
        int: ["EnumLiteral", [0, 1, -2]],
        type: ["EnumLiteral", ["foobar"]],
        idx: ["EnumLiteral", [46]],
        bii: ["EnumLiteral", [22n]],
        truthy: ["EnumLiteral", [true]],
        falsy: ["EnumLiteral", [false]],
        strOpt: [true, "EnumLiteral", ["v1", "v2", "v3"]],
        intOpt: [true, "EnumLiteral", [0n, 1n, -2n]]
    };
    constructor(str, int, type, idx, bii, truthy, falsy, strOpt, intOpt) {
        this.str = str;
        this.int = int;
        this.type = type;
        this.idx = idx;
        this.bii = bii;
        this.truthy = truthy;
        this.falsy = falsy;
        this.strOpt = strOpt;
        this.intOpt = intOpt;
    }
}
export class FullModel extends BaseModel {
    static class = {
        baseAbstract: "Str",
        strOpt: [true, "Str"],
        intOpt: [true, "Int"],
        floatOpt: [true, "Float"],
        bignOpt: [true, "BigInt"],
        boolOpt: [true, "Bool"],
        dateOpt: [true, "Date"],
        buffOpt: [true, "Buff"],
        arrOpt: [true, "Arr", [true, "Str"]],
        setOpt: [true, "Set", [true, "Float"]],
        mapOpt: [true, "Map", "Int", [true, "Str"]],
        enumNumOpt: [true, "Enum", EnumA],
        enumStrOpt: [true, "Enum", EnumC],
        clsOpt: [true, SmallModel],
        uniOpt: [true, "Union", "Str", "Float", ["Arr", "Str"]],
        uniAliasOpt: [true, "Union", UnionA, UnionB, UnionC],
        str: "Str",
        int: "Int",
        float: "Float",
        bign: "BigInt",
        bool: "Bool",
        date: "Date",
        buff: "Buff",
        arr: ["Arr", "Str"],
        set: ["Set", "Float"],
        map: ["Map", "Float", "Str"],
        enumNum: ["Enum", EnumA],
        enumStr: ["Enum", EnumB],
        cls: SmallModel,
        face: {
            class: {
                float: "Float",
                bign: "BigInt",
                bool: "Bool",
                date: "Date",
                buff: "Buff",
                arr: ["Arr", "Str"],
                set: ["Set", "Float"],
                map: ["Map", "Float", "Str"],
                enumNum: ["Enum", EnumA],
                enumStr: ["Enum", EnumB],
                cls: SmallModel,
                uni: ["Union", "Str", "Float", SmallModel, ["Arr", "Str"]],
                uniAlias: ["Union", UnionA, UnionB],
                floatOpt: [true, "Float"],
                bignOpt: [true, "BigInt"],
                boolOpt: [true, "Bool"],
                dateOpt: [true, "Date"],
                buffOpt: [true, "Buff"],
                arrOpt: [true, "Arr", [true, "Str"]],
                setOpt: [true, "Set", [true, "Float"]],
                mapOpt: [true, "Map", "Int", [true, "Str"]],
                enumNumOpt: [true, "Enum", EnumA],
                enumStrOpt: [true, "Enum", EnumC],
                clsOpt: [true, SmallModel],
                uniOpt: [true, "Union", "Str", "Float", ["Arr", "Str"]],
                uniAliasOpt: [true, "Union", UnionA, UnionB, UnionC],
                str: ["EnumLiteral", ["v1", "v2", "v3"]],
                int: ["EnumLiteral", [0, 1, -2]],
                type: ["EnumLiteral", ["foobar"]],
                idx: ["EnumLiteral", [46]],
                bii: ["EnumLiteral", [22n]],
                truthy: ["EnumLiteral", [true]],
                falsy: ["EnumLiteral", [false]],
                strOpt: [true, "EnumLiteral", ["v1", "v2", "v3"]],
                intOpt: [true, "EnumLiteral", [0n, 1n, -2n]]
            },
            name: "IModelD"
        },
        uni: ["Union", "Str", "Float", SmallModel, ["Arr", "Str"]],
        uniAlias: ["Union", UnionA, UnionB],
        baseArr: ["Arr", "Str"],
        baseBool: "Bool",
        baseStr: "Str",
        baseInt: "Int"
    };
    constructor(str, int, float, bign, bool, date, buff, arr, set, map, enumNum, enumStr, cls, face, uni, uniAlias) {
        super("erg", 10);
        this.str = str;
        this.int = int;
        this.float = float;
        this.bign = bign;
        this.bool = bool;
        this.date = date;
        this.buff = buff;
        this.arr = arr;
        this.set = set;
        this.map = map;
        this.enumNum = enumNum;
        this.enumStr = enumStr;
        this.cls = cls;
        this.face = face;
        this.uni = uni;
        this.uniAlias = uniAlias;
        this.anotherIgnored = () => "erg";
    }
    static staticMethod() {
        return "erg";
    }
    get getter() {
        return "erge";
    }
    method() {
        return "erg";
    }
}
FullModel.staticStr = "er";

`

// language=js
const srcFileBExp = `
import { Typ } from "@kindred-bff-core/runtime/type-specification";
export var EnumB;
(function (EnumB) {
    EnumB["One"] = "One 1";
    EnumB["Two"] = "Two 2";
    EnumB["None"] = "None";
})(EnumB || (EnumB = {}));
export class CustomClassDef {
    constructor(str, int) {
        this.str = str;
        this.int = int;
    }
}
CustomClassDef.class = {
    str: Typ.Str,
    int: Typ.Int,
};
export class SmallModel {
    static class = {
        str: "Str",
        int: "Float"
    };
    constructor(str, int) {
        this.str = str;
        this.int = int;
    }
}
export class BaseMergeModel {
    static class = {
        str: "Str",
        en: ["Enum", EnumB]
    };
    constructor(str, en) {
        this.str = str;
        this.en = en;
    }
}
export class UnionA {
    static class = {};
}
export class UnionB {
    static class = {};
}
`

// language=js
const srcFileCExp = `
import { EnumB } from "@test/a";
export class MergedModel {
    static class = {
        str: "Str",
        en: [true, "Enum", EnumB]
    };
}
`

it("transforms specification class", () => {
  const result = compile(new Map([
    [ "@test/index.ts", srcFileA ],
    [ "@test/a.ts", srcFileB ],
    [ "@test/c.ts", srcFileC ],
  ]), {
    baseUrl: path.resolve("."),
    paths:   {
      "@kindred-bff-core/*": [
        "src/*",
      ],
    },
  }, (typeChecker, options) => typeSpecificationTransformer(typeChecker, {
    fileNameMatcher: "(a|c)\\.ts",
  }))

  expect(result.get("@test/index.js")!.trim()).toBe(srcFileAExp.trim())
  expect(result.get("@test/a.js")!.trim()).toBe(srcFileBExp.trim())
  expect(result.get("@test/c.js")!.trim()).toBe(srcFileCExp.trim())
})
