import { randomUUID } from "node:crypto";
import { db } from "@/server/db/database";
import { sendSessionEmail } from "@/server/integrations/email";

export async function runEmailWorker(){
  const database=db(),now=new Date().toISOString();database.prepare("INSERT OR IGNORE INTO email_outbox(id,session_id,status,next_attempt_at,created_at) SELECT ?,s.id,'PENDING',?,? FROM sessions s JOIN meetings m ON m.session_id=s.id WHERE s.email_sent_at IS NULL AND s.expires_at<=? LIMIT 1").run(randomUUID(),now,now,now);
  const jobs=database.prepare("SELECT * FROM email_outbox WHERE status='PENDING' AND next_attempt_at<=? AND attempts<5 ORDER BY created_at LIMIT 10").all(now) as {id:string,session_id:string,attempts:number}[];
  for(const job of jobs){try{await sendSessionEmail(job.session_id);database.prepare("UPDATE email_outbox SET status='SENT',sent_at=? WHERE id=?").run(new Date().toISOString(),job.id);database.prepare("UPDATE sessions SET email_sent_at=? WHERE id=?").run(new Date().toISOString(),job.session_id);}catch(error){const attempts=job.attempts+1,next=new Date(Date.now()+Math.min(3600_000,2**attempts*60_000)).toISOString();database.prepare("UPDATE email_outbox SET attempts=?,next_attempt_at=?,last_error=? WHERE id=?").run(attempts,next,error instanceof Error?error.message.slice(0,300):"error",job.id);}}
}
if(import.meta.url===`file://${process.argv[1]?.replace(/\\/g,"/")}`)runEmailWorker().catch(()=>process.exitCode=1);
