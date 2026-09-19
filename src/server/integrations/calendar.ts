import { randomUUID } from "node:crypto";
import { env } from "@/server/config/env";

type CalendarEvent={id:string;start:Date;end:Date;summary:string;description:string};
const auth=()=>`Basic ${Buffer.from(`${env().YANDEX_CALDAV_LOGIN}:${env().YANDEX_CALDAV_PASSWORD}`).toString("base64")}`;
export function calendarConfigured(){return Boolean(env().YANDEX_CALDAV_PASSWORD&&env().YANDEX_CALENDAR_URL);}
async function request(url:string,init:RequestInit){ const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),8_000); try{return await fetch(url,{...init,signal:controller.signal,headers:{authorization:auth(),...init.headers}});}finally{clearTimeout(timer);} }
const icsDate=(date:Date)=>date.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
const escapeIcs=(s:string)=>s.replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
export async function isFree(start:Date,end:Date){
  if(!calendarConfigured()) return env().NODE_ENV!=="production";
  const body=`<?xml version="1.0"?><c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range start="${icsDate(start)}" end="${icsDate(end)}"/></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>`;
  const response=await request(env().YANDEX_CALENDAR_URL,{method:"REPORT",headers:{"content-type":"application/xml; charset=utf-8",depth:"1"},body});
  if(!response.ok)throw new Error("Календарь временно недоступен"); const text=await response.text(); return !/<d:response|<response/i.test(text.replace(/^.*?<multistatus[^>]*>/is,""));
}
export async function createCalendarEvent(event:Omit<CalendarEvent,"id">){
  const id=randomUUID(); if(!calendarConfigured())return `dev-${id}`;
  const ics=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//AI-Run//Secretary//RU\r\nBEGIN:VEVENT\r\nUID:${id}@ai-run.ru\r\nDTSTAMP:${icsDate(new Date())}\r\nDTSTART:${icsDate(event.start)}\r\nDTEND:${icsDate(event.end)}\r\nSUMMARY:${escapeIcs(event.summary)}\r\nDESCRIPTION:${escapeIcs(event.description)}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
  const base=env().YANDEX_CALENDAR_URL.replace(/\/?$/,"/"); const response=await request(`${base}${id}.ics`,{method:"PUT",headers:{"content-type":"text/calendar; charset=utf-8","if-none-match":"*"},body:ics}); if(!response.ok)throw new Error("Не удалось создать событие в календаре"); return `${base}${id}.ics`;
}
export async function deleteCalendarEvent(url:string){ if(url.startsWith("dev-"))return; const response=await request(url,{method:"DELETE"}); if(!response.ok&&response.status!==404)throw new Error("Не удалось отменить событие"); }
