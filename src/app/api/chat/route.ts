import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleMessage } from "@/server/domain/conversation";
import { verify } from "@/server/security/crypto";
export const runtime="nodejs";
const input=z.object({sessionId:z.string().uuid(),message:z.string().min(1).max(2000)});
export async function POST(request:NextRequest){try{const data=input.parse(await request.json()),cookie=verify(request.cookies.get("ai_run_session")?.value);if(cookie!==data.sessionId)return NextResponse.json({error:"Сессия недействительна"},{status:403});return NextResponse.json({sessionId:data.sessionId,message:await handleMessage(data.sessionId,data.message)});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Временная ошибка"},{status:400});}}
