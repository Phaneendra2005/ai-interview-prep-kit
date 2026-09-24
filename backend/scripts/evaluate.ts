import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { KitService } from '../src/services/kit.service';
import { ExtractionService } from '../src/services/extraction.service';
import { RetrievalService } from '../src/services/retrieval.service';
import { LinkDiscoveryService } from '../src/services/discovery.service';
import { GenerationService } from '../src/services/generation.service';
import { CoverageService } from '../src/services/coverage.service';
import { SchedulingService } from '../src/services/scheduling.service';
import { getLLMProvider } from '../src/services/llm.provider';
import { DiscussionProvider } from '../src/services/discussion.provider';
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config();
// Required for localhost URLs in batch tests
process.env.ALLOW_LOCALHOST_FETCH = 'true';

async function main() {
  let inputFile = '';
  let outputFile = '';

  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--input') inputFile = process.argv[i + 1];
    if (process.argv[i] === '--output') outputFile = process.argv[i + 1];
  }

  if (!inputFile && process.argv.length >= 4 && !process.argv[2].startsWith('--')) {
    inputFile = process.argv[2];
    outputFile = process.argv[3] || process.argv[4]; // in case it's like cases.json --output kits.json
    if (process.argv[3] === '--output') outputFile = process.argv[4];
  }

  if (!inputFile || !outputFile) {
    console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
    process.exit(1);
  }

  inputFile = path.resolve(process.cwd(), '..', inputFile);
  outputFile = path.resolve(process.cwd(), '..', outputFile);

  console.log(`Evaluating cases from ${inputFile}...`);

  if (!fs.existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`);
    process.exit(1);
  }

  const cases = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const results = [];

  const mongoServer = await MongoMemoryServer.create();
  const MONGO_URI = mongoServer.getUri();
  await mongoose.connect(MONGO_URI);

  const llmProvider = getLLMProvider();
  const retrievalService = new RetrievalService({ allowLocalhost: true });
  const kitService = new KitService(
    new ExtractionService(llmProvider),
    retrievalService,
    new LinkDiscoveryService(),
    new GenerationService(llmProvider),
    new CoverageService(),
    new SchedulingService(),
    new DiscussionProvider(retrievalService)
  );

  // Mock a system user for evaluation
  const sysUserId = new mongoose.Types.ObjectId().toString();

  for (const c of cases) {
    console.log(`Processing case ${c.id}...`);
    try {
      const kit = await kitService.generateKit(sysUserId, c.jdText, c.companyUrl, c.days);
      results.push({
        id: c.id,
        status: 'ok',
        kit: kit.toObject(),
        error: null
      });
      console.log(`Case ${c.id} completed successfully.`);
    } catch (error: any) {
      console.error(`Case ${c.id} failed:`, error.message);
      results.push({
        id: c.id,
        status: 'failed',
        kit: null,
        error: {
          code: error.name || 'UNKNOWN_ERROR',
          message: error.message
        }
      });
    }
  }

  const finalOutput = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    kits: results
  };

  fs.writeFileSync(outputFile, JSON.stringify(finalOutput, null, 2));
  console.log(`Evaluation complete. Wrote ${results.length} results to ${outputFile}`);
  
  await mongoose.disconnect();
  await mongoServer.stop();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error during evaluation:', err);
  process.exit(1);
});
