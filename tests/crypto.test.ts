import { describe,expect,it } from "vitest";
import { decrypt,encrypt,sign,verify } from "@/server/security/crypto";
describe("secure values",()=>{it("encrypts and decrypts PII",()=>{const encrypted=encrypt("+7 999 123-45-67");expect(encrypted).not.toContain("999");expect(decrypt(encrypted)).toBe("+7 999 123-45-67");});it("rejects a forged signed value",()=>{const value=sign("session");expect(verify(value)).toBe("session");expect(verify(`${value}x`)).toBeUndefined();});});
