import nodemailer from "nodemailer";
import { env } from "@/server/config/env";
import { db } from "@/server/db/database";
import { decrypt } from "@/server/security/crypto";
import { formatMoscow } from "@/server/domain/schedule";

export async function sendSessionEmail(sessionId:string){
  if(!env().SMTP_PASSWORD){if(env().NODE_ENV==="production")throw new Error("SMTP не настроен");return;}
  const lead=db().prepare("SELECT * FROM leads WHERE session_id=?").get(sessionId) as Record<string,string|null>,meeting=db().prepare("SELECT * FROM meetings WHERE session_id=?").get(sessionId) as Record<string,string>,messages=db().prepare("SELECT role,text,created_at FROM messages WHERE session_id=? ORDER BY id").all(sessionId) as {role:string,text:string,created_at:string}[];
  const name=lead.name_cipher?decrypt(lead.name_cipher):"Не указано",phone=lead.phone_cipher?decrypt(lead.phone_cipher):"Не указано"; const value=(v:string|null)=>v||"Не указано";
  const body=[`Дата и время: ${formatMoscow(new Date(meeting.starts_at))} МСК`,`Длительность: ${Math.round((new Date(meeting.ends_at).getTime()-new Date(meeting.starts_at).getTime())/60000)} минут`,`Имя: ${name}`,`Телефон: ${phone}`,`Сайт: ${value(lead.website)}`,`Организация: ${value(lead.activity)}`,`Ключевой процесс: ${value(lead.process)}`,`Проблема: ${value(lead.problem)}`,`Последствия: ${value(lead.consequences)}`,"","ДИАЛОГ",...messages.map(m=>`${m.role}: ${m.text}`)].join("\n");
  const transporter=nodemailer.createTransport({host:env().SMTP_HOST,port:env().SMTP_PORT,secure:env().SMTP_SECURE,auth:{user:env().SMTP_LOGIN,pass:env().SMTP_PASSWORD}});await transporter.sendMail({from:env().SMTP_FROM,to:env().SMTP_TO,subject:`${formatMoscow(new Date(meeting.starts_at))} — ${name} — ${phone}`,text:body});
}
