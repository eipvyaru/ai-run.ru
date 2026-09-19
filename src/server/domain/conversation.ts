import { randomUUID } from "node:crypto";
import { db } from "@/server/db/database";
import { decrypt, encrypt } from "@/server/security/crypto";
import { createCalendarEvent, isFree } from "@/server/integrations/calendar";
import { formatMoscow, parseDesiredTime, validateSlot } from "./schedule";
import { saveMessage, sessionById, touch } from "./sessions";
import { polishReply } from "@/server/llm/gateway";

const phonePattern=/^(?:\+?7|8)?[\s()-]*\d{3}[\s()-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}$/;
export async function handleMessage(sessionId:string,text:string){
  const session=sessionById(sessionId); if(!session?.consented_at)throw new Error("Сначала подтвердите согласие на обработку персональных данных.");
  const clean=text.trim().slice(0,2000); if(!clean)throw new Error("Сообщение пустое"); saveMessage(sessionId,"USER",clean);
  let reply=""; let next=session.status;
  if(session.status==="WAITING_NAME"){ if(clean.length<2){reply="Подскажите, пожалуйста, как я могу к вам обращаться?";}else{db().prepare("UPDATE leads SET name_cipher=? WHERE session_id=?").run(encrypt(clean),sessionId);next="WAITING_PHONE";reply="Укажите, пожалуйста, номер телефона, по которому руководитель сможет вам позвонить.";} }
  else if(session.status==="WAITING_PHONE"){ if(!phonePattern.test(clean)){reply="Похоже, в номере есть ошибка. Проверьте, пожалуйста, и отправьте его ещё раз.";}else{db().prepare("UPDATE leads SET phone_cipher=? WHERE session_id=?").run(encrypt(clean),sessionId);next="WAITING_TIME";reply="Когда вам было бы удобно поговорить? Укажите дату и время, например: «25 сентября в 16:00».";} }
  else if(session.status==="WAITING_TIME"){
    const desired=parseDesiredTime(clean); if(!desired){reply="Уточните, пожалуйста, дату и точное время разговора — например, «25 сентября в 16:00».";}
    else {const validation=validateSlot(desired); if(!validation.ok){reply=`${validation.reason} Предложите, пожалуйста, другое время.`;}else if(!(await isFree(validation.start! ,validation.end!))){reply="К сожалению, это время занято. Предложите другое время в рабочем интервале, и я сразу проверю его.";}else if(!(await isFree(validation.start!,validation.end!))){reply="К сожалению, это время только что стало недоступно. Предложите другое время.";}else{
      const refreshed=db().prepare("SELECT * FROM leads WHERE session_id=?").get(sessionId) as Record<string,string>; const name=decrypt(refreshed.name_cipher),phone=decrypt(refreshed.phone_cipher); const eventId=await createCalendarEvent({start:validation.start!,end:validation.end!,summary:`AI-Run — ${name} — ${phone}`,description:`Источник: ai-run.ru\nСессия: ${sessionId}`}); const id=randomUUID(),now=new Date().toISOString(); db().prepare("INSERT INTO meetings(id,session_id,calendar_event_id,starts_at,ends_at,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").run(id,sessionId,eventId,validation.start!.toISOString(),validation.end!.toISOString(),"CONFIRMED",now,now); next="WAITING_WEBSITE"; reply=`Готово. Телефонный разговор назначен на ${formatMoscow(validation.start!)} МСК.\n\nЧтобы руководитель мог заранее разобраться в вашей ситуации, задам ещё несколько коротких вопросов. Подскажите сайт вашей организации, если он есть.`;
    }}
  }
  else if(session.status==="WAITING_WEBSITE"){ db().prepare("UPDATE leads SET website=? WHERE session_id=?").run(/^(нет|не ?ту|отсутств)/i.test(clean)?null:clean,sessionId);next="WAITING_ACTIVITY";reply="Чем занимается ваша организация?"; }
  else if(session.status==="WAITING_ACTIVITY"){db().prepare("UPDATE leads SET activity=? WHERE session_id=?").run(clean,sessionId);next="WAITING_PROCESS";reply="В каком процессе сейчас чаще всего возникают задержки, потерянные задачи или необходимость ручного контроля?";}
  else if(session.status==="WAITING_PROCESS"){db().prepare("UPDATE leads SET process=? WHERE session_id=?").run(clean,sessionId);next="WAITING_PROBLEM";reply="Что именно сейчас происходит не так?";}
  else if(session.status==="WAITING_PROBLEM"){db().prepare("UPDATE leads SET problem=? WHERE session_id=?").run(clean,sessionId);next="WAITING_CONSEQUENCES";reply="К чему обычно приводит эта проблема — к потерянным заявкам, задержкам, конфликтам или дополнительной нагрузке?";}
  else if(session.status==="WAITING_CONSEQUENCES"){db().prepare("UPDATE leads SET consequences=? WHERE session_id=?").run(clean,sessionId);next="COMPLETED";const meeting=db().prepare("SELECT starts_at FROM meetings WHERE session_id=?").get(sessionId) as {starts_at:string};reply=`Спасибо. Информацию передал руководителю. Телефонный разговор назначен на ${formatMoscow(new Date(meeting.starts_at))} МСК. До связи!`;db().prepare("INSERT OR IGNORE INTO email_outbox(id,session_id,status,next_attempt_at,created_at) VALUES(?,?,?,?,?)").run(randomUUID(),sessionId,"PENDING",new Date().toISOString(),new Date().toISOString());}
  else reply="Встреча уже назначена, а информация сохранена. Если нужно перенести или отменить её, напишите об этом.";
  touch(sessionId,next); reply=await polishReply(sessionId,reply);saveMessage(sessionId,"ASSISTANT",reply); return reply;
}
