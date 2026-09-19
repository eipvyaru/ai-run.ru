import { cookies } from "next/headers";
import { env } from "@/server/config/env";
import { sign, verify } from "@/server/security/crypto";
export function adminToken(){return sign(`admin:${env().ADMIN_LOGIN}:${Date.now()}`);}
export function validAdminToken(value?:string){const raw=verify(value);if(!raw)return false;const [role,email,time]=raw.split(":");return role==="admin"&&email===env().ADMIN_LOGIN&&Date.now()-Number(time)<8*3600000;}
export async function requireAdmin(){return validAdminToken((await cookies()).get("ai_run_admin")?.value);}
