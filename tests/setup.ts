import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
Object.assign(process.env,{NODE_ENV:"test",DATABASE_PATH:join(mkdtempSync(join(tmpdir(),"ai-run-test-")),"test.sqlite"),SESSION_SECRET:"test-session-secret-is-at-least-thirty-two-characters",PII_ENCRYPTION_KEY:"11".repeat(32)});
