import { jest } from "@jest/globals"

if(!global.jest){
  (global as any).jest = jest
}
