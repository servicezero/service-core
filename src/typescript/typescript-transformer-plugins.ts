import type ts from "typescript"

export interface ITransformHelpers{
  addDiagnostic(diag: ts.Diagnostic): void
}

export interface ICustomTransformFactory<T = unknown>{
  (typeChecker: ts.TypeChecker, options: Partial<T>, helpers?: ITransformHelpers): ts.CustomTransformers
}
