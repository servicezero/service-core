
export function mockExportReset<T>(module: T, exportName: keyof T){
  (module as any).__mock_reset__?.(exportName)
}

export function mockExport<T, M>(module: T, exportName: keyof T, mock: M): M{
  (module as any).__mock_set__?.(exportName, mock)
  return mock
}

