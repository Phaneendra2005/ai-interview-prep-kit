# Assessment Requirements Checklist

| Requirement | Implementation | Test | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| User registration, login, logout | Express session with connect-mongo, bcrypt | auth.test.ts | PASS | Auth controller and routes implemented |
| Secure sessions | HttpOnly, secure in prod | app.ts | PASS | Express session config |
| Users access only own kits | kit.service scopes to userId | Manual verify | PASS | Kit Service orchestration |
| Creating kit from JD, URL, days | POST /api/kits logic mapped via frontend | Manual verify | PASS | kit.service.ts and New Kit UI |
| Visible generation progress | Frontend tracks status (pending, researching, etc) | UI | PARTIAL | Status exposed in schema, UI needs polling implemented |
| Company research / Crawler | RetrievalService with Axios/Cheerio | Tested SSRF logic | PASS | retrieval.service.ts |
| SSRF protection / Reject localhost | DNS lookup and ipaddr validation | Unit tests | PASS | retrieval.service.ts |
| Link discovery/ranking | LinkDiscoveryService ranks by keywords | Manual verify | PASS | discovery.service.ts |
| Requirement extraction | ExtractionService + Zod validation | Manual verify | PASS | extraction.service.ts |
| Stable IDs | LLM extraction mapped to strictly deterministic 'r1' format | Manual verify | PASS | extraction.service.ts |
| Question generation by category | GenerationService splits LLM requests by category | Manual verify | PASS | generation.service.ts |
| Flashcard generation | GenerationService | Manual verify | PASS | generation.service.ts |
| Deterministic schedule allocation | SchedulingService allocates 15/30m intervals deterministically | schedule.test.ts | PASS | scheduling.service.ts |
| Deterministic coverage checking | CoverageService compares req IDs natively | coverage.test.ts | PASS | coverage.service.ts |
| Second-pass generation | Orchestrated in KitService if coverage gaps exist | Manual verify | PASS | kit.service.ts |
| Regeneration preserves edits | Schema allows `source` tracking (generated vs edited) | Manual verify | PARTIAL | Schema updated, frontend edit UI scaffolding incomplete |
| Practice mode | React Flashcard view | UI | PASS | practice/page.tsx |
| Automated tests | Jest tests for coverage, schedule, auth, validation | test suites | PASS | tests/ |
| Batch evaluator | scripts/evaluate.ts runs same pipeline | evaluate.ts | PASS | scripts/evaluate.ts |
| Localhost batch test | Evaluator overrides SSRF via ALLOW_LOCALHOST_FETCH | evaluate.ts | PASS | evaluate.ts sets process.env.ALLOW_LOCALHOST_FETCH |
