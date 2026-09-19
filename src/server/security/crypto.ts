import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/server/config/env";

function key(){ const configured=env().PII_ENCRYPTION_KEY; return configured ? Buffer.from(configured,"hex") : createHash("sha256").update(env().SESSION_SECRET).digest(); }
export function encrypt(value:string){ const iv=randomBytes(12); const cipher=createCipheriv("aes-256-gcm",key(),iv); const body=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]); return [iv.toString("base64url"),cipher.getAuthTag().toString("base64url"),body.toString("base64url")].join("."); }
export function decrypt(value:string){ const [i,t,b]=value.split("."); const decipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(i,"base64url")); decipher.setAuthTag(Buffer.from(t,"base64url")); return Buffer.concat([decipher.update(Buffer.from(b,"base64url")),decipher.final()]).toString("utf8"); }
export function sign(value:string){ return `${value}.${createHmac("sha256",env().SESSION_SECRET).update(value).digest("base64url")}`; }
export function verify(signed?:string){ if(!signed)return; const index=signed.lastIndexOf("."); if(index<1)return; const value=signed.slice(0,index), signature=signed.slice(index+1), expected=createHmac("sha256",env().SESSION_SECRET).update(value).digest("base64url"); const a=Buffer.from(signature),b=Buffer.from(expected); return a.length===b.length&&timingSafeEqual(a,b)?value:undefined; }
