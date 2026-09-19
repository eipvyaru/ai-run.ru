import { describe,expect,it } from "vitest";
import { parseDesiredTime,validateSlot } from "@/server/domain/schedule";
describe("schedule",()=>{const now=new Date("2026-09-21T09:00:00.000Z");it("parses an explicit Moscow date",()=>{expect(parseDesiredTime("25.09.2026 в 15:00",now)?.toISOString()).toBe("2026-09-25T12:00:00.000Z");});it("accepts a configured Friday slot",()=>{expect(validateSlot(new Date("2026-09-25T12:00:00.000Z"),now).ok).toBe(true);});it("rejects a weekend",()=>{expect(validateSlot(new Date("2026-09-26T12:00:00.000Z"),now).ok).toBe(false);});});
