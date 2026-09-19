import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createConsent } from "@/server/domain/sessions";
import { env } from "@/server/config/env";
import { sign } from "@/server/security/crypto";
export const runtime="nodejs";
export async function POST(request:NextRequest){try{z.object({consent:z.literal(true)}).parse(await request.json());const origin=request.headers.get("origin"),allowed=new Set([env().APP_ORIGIN,request.nextUrl.origin,"http://127.0.0.1:8787","http://localhost:8787"]);if(origin&&!allowed.has(origin))return NextResponse.json({error:"Недопустимый источник запроса"},{status:403});const ip=env().TRUSTED_PROXY?(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()??"unknown"):"unavailable";const id=createConsent(ip,request.headers.get("user-agent")??"unknown");const response=NextResponse.json({sessionId:id});response.cookies.set("ai_run_session",sign(id),{httpOnly:true,secure:env().NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24});return response;}catch{return NextResponse.json({error:"Не удалось зафиксировать согласие"},{status:400});}}
