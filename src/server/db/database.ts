import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { env } from "@/server/config/env";

let instance: DatabaseSync | undefined;
export function db(){
  if(instance) return instance;
  const path=resolve(env().DATABASE_PATH); mkdirSync(dirname(path),{recursive:true});
  instance=new DatabaseSync(path); instance.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  instance.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  const applied=new Set((instance.prepare("SELECT version FROM schema_migrations").all() as {version:string}[]).map(r=>r.version));
  for(const file of readdirSync(resolve("migrations")).filter(f=>f.endsWith(".sql")).sort()) if(!applied.has(file)){
    instance.exec("BEGIN IMMEDIATE"); try{ instance.exec(readFileSync(resolve("migrations",file),"utf8")); instance.prepare("INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)").run(file,new Date().toISOString()); instance.exec("COMMIT"); }catch(error){instance.exec("ROLLBACK");throw error;}
  }
  return instance;
}
