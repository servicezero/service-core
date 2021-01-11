import path from "path"
import typescriptTransformerExportMock from "./typescript-transformer-export-mock"
import { compile } from "./typescript-transformer-utils"

// language=ts
const srcFileB = `
  export enum EnumB{
    One  = "One 1",
    Two  = "Two 2",
    None = "None",
  }

  export class CustomClassDef{
    static readonly foo = "erg"

    constructor(){
        const bla = EnumB.One
    }
  }

  const foo = {
    CustomClassDef(){
        return false
    }
  }
  foo.CustomClassDef()
`

// language=ts
const srcFileA = `
  export default class CustomClassDef{
    static readonly foo = "erg"
  }
`

// language=ts
const srcFileC = `
  export default function init(){
    return 10
  }
  init()
`

// language=js
const srcFileAExp = `
class CustomClassDef {
}
const default$1 = CustomClassDef;
export let default$default = default$1;
export default default$default;
CustomClassDef.foo = "erg";
/* istanbul ignore next */
const __mock_originals_map__ = {
    default: default$1,
};
/* istanbul ignore next */
export function __mock_reset__(prop) {
    __mock_set__(prop, __mock_originals_map__[prop]);
}
/* istanbul ignore next */
export function __mock_original__(prop) {
    return __mock_originals_map__[prop];
}
/* istanbul ignore next */
export function __mock_set__(prop, value) {
    switch (prop) {
        case "default": {
            default$default = value;
            break;
        }
    }
}
`

// language=js
const srcFileBExp = `
var EnumB$1;
export let EnumB = EnumB$1;
(function (EnumB) {
    EnumB["One"] = "One 1";
    EnumB["Two"] = "Two 2";
    EnumB["None"] = "None";
})(EnumB || (EnumB = {}));
export class CustomClassDef$1 {
    static name = "CustomClassDef";
    constructor() {
        const bla = EnumB.One;
    }
}
export let CustomClassDef = CustomClassDef$1;
CustomClassDef.foo = "erg";
const foo = {
    CustomClassDef() {
        return false;
    }
};
foo.CustomClassDef();
/* istanbul ignore next */
const __mock_originals_map__ = {
    EnumB: EnumB$1,
    CustomClassDef: CustomClassDef$1,
};
/* istanbul ignore next */
export function __mock_reset__(prop) {
    __mock_set__(prop, __mock_originals_map__[prop]);
}
/* istanbul ignore next */
export function __mock_original__(prop) {
    return __mock_originals_map__[prop];
}
/* istanbul ignore next */
export function __mock_set__(prop, value) {
    switch (prop) {
        case "EnumB": {
            EnumB = value;
            break;
        }
        case "CustomClassDef": {
            CustomClassDef = value;
            break;
        }
    }
}
`

// language=js
const srcFileCExp = `
function init() {
    return 10;
}
const default$1 = init;
export let default$default = default$1;
export default default$default;
init();
/* istanbul ignore next */
const __mock_originals_map__ = {
    default: default$1,
};
/* istanbul ignore next */
export function __mock_reset__(prop) {
    __mock_set__(prop, __mock_originals_map__[prop]);
}
/* istanbul ignore next */
export function __mock_original__(prop) {
    return __mock_originals_map__[prop];
}
/* istanbul ignore next */
export function __mock_set__(prop, value) {
    switch (prop) {
        case "default": {
            default$default = value;
            break;
        }
    }
}
`

it("transforms export mocks", () => {
  const result = compile(new Map([
    [ "@test/index.ts", srcFileA ],
    [ "@test/a.ts", srcFileB ],
    [ "@test/c.ts", srcFileC ],
  ]), {
    baseUrl: path.resolve("."),
    paths:   {
      "@service-core/*": [
        "src/*",
      ],
    },
  }, (typeChecker, options) => typescriptTransformerExportMock({}))

  expect(result.get("@test/index.js")!.trim()).toBe(srcFileAExp.trim())
  expect(result.get("@test/a.js")!.trim()).toBe(srcFileBExp.trim())
  expect(result.get("@test/c.js")!.trim()).toBe(srcFileCExp.trim())
})
