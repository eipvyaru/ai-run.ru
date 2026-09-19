import { readFileSync } from "node:fs";
import { env } from "@/server/config/env";
import { db } from "@/server/db/database";
import { decrypt } from "@/server/security/crypto";

function protectedHistory(sessionId:string){
  const lead=db().prepare("SELECT name_cipher,phone_cipher,name_alias,phone_alias FROM leads WHERE session_id=?").get(sessionId) as {name_cipher:string|null,phone_cipher:string|null,name_alias:string,phone_alias:string};
  const replacements:[string,string][]=[];if(lead.name_cipher)replacements.push([decrypt(lead.name_cipher),lead.name_alias]);if(lead.phone_cipher)replacements.push([decrypt(lead.phone_cipher),lead.phone_alias]);
  return (db().prepare("SELECT role,text FROM messages WHERE session_id=? ORDER BY id DESC LIMIT 12").all(sessionId) as {role:string,text:string}[]).reverse().map(message=>{let text=message.text;for(const [raw,alias] of replacements)text=text.split(raw).join(alias);text=text.replace(/(?:\+?7|8)[\s()-]*\d{3}[\s()-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/g,lead.phone_alias);return{role:message.role==="USER"?"user":"assistant",content:text};});
}

export async function polishReply(sessionId:string,drafted:string){
  if(!env().LLM_API_KEY)return drafted;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),env().LLM_TIMEOUT_MS);
  try{const response=await fetch(`${env().LLM_API_ENDPOINT.replace(/\/$/,"")}/chat/completions`,{method:"POST",signal:controller.signal,headers:{authorization:`Bearer ${env().LLM_API_KEY}`,"content-type":"application/json"},body:JSON.stringify({model:env().LLM_DEFAULT_MODEL,max_tokens:Math.min(env().LLM_MAX_OUTPUT_TOKENS,1200),messages:[{role:"system",content:readFileSync(env().SYSTEM_PROMPT_PATH,"utf8")},...protectedHistory(sessionId),{role:"system",content:`Доверенный результат приложения. Сформулируй краткий ответ пользователю, не меняя фактов, дат, статуса и следующего вопроса:\n${drafted}`} ]})});if(!response.ok)return drafted;const data=await response.json() as {choices?:{message?:{content?:string}}[]};return data.choices?.[0]?.message?.content?.trim()||drafted;}catch{return drafted;}finally{clearTimeout(timer);}
}
