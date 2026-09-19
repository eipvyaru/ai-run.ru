import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development","test","production"]).default("development"),
  APP_ORIGIN: z.string().url().default("http://localhost:8787"),
  DATABASE_PATH: z.string().default("./data/ai-run.ru.sqlite"),
  SYSTEM_PROMPT_PATH: z.string().default("./data/system_prompt.md"),
  SESSION_SECRET: z.string().min(32).default("development-session-secret-change-me-32"),
  PII_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/).optional(),
  ADMIN_LOGIN: z.string().email().default("eipv@ya.ru"), ADMIN_PASSWORD: z.string().default(""),
  LLM_API_ENDPOINT: z.string().url().default("https://api.kodikrouter.ru/v1"), LLM_API_KEY: z.string().default(""),
  LLM_DEFAULT_MODEL: z.string().default("openai/gpt-5.6-luna"), LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(1800), LLM_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(8000),
  YANDEX_CALDAV_URL: z.string().url().default("https://caldav.yandex.ru"), YANDEX_CALDAV_LOGIN: z.string().default("eipv@yandex.ru"), YANDEX_CALDAV_PASSWORD: z.string().default(""), YANDEX_CALENDAR_URL: z.string().default(""),
  SMTP_HOST: z.string().default("smtp.ht-systems.ru"), SMTP_PORT: z.coerce.number().int().default(465), SMTP_SECURE: z.string().default("true").transform(v=>v==="true"), SMTP_LOGIN: z.string().default("noreply@ai-run.ru"), SMTP_PASSWORD: z.string().default(""), SMTP_FROM: z.string().default("noreply@ai-run.ru"), SMTP_TO: z.string().default("igor@ai-run.ru"),
  TRUSTED_PROXY: z.string().default("false").transform(v=>v==="true")
});

let cached: z.infer<typeof schema> | undefined;
export function env(){ cached ??= schema.parse(process.env); return cached; }
