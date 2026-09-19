import { db } from "../src/server/db/database";db().prepare("PRAGMA optimize").run();console.log("Migrations applied");
