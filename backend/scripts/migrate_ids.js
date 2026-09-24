const mongoose = require('mongoose');
const { Kit } = require('../dist/src/models/Kit');

async function migrate() {
  await mongoose.connect('mongodb+srv://kphaneendra2005_db_user:Phani212005@cluster0.s8gdswo.mongodb.net/?appName=Cluster0');
  const kits = await Kit.find({});
  for (const kit of kits) {
    if (!kit.questions) continue;
    
    let updated = false;
    const oldToNew = {};

    kit.questions.forEach((q, index) => {
      // If the ID is like q-1, q-2, it's not a valid ObjectId.
      // Or if it's a duplicate. We can just give all questions that don't look like ObjectIds a new one.
      if (!mongoose.Types.ObjectId.isValid(q.id) || oldToNew[q.id]) {
        const newId = new mongoose.Types.ObjectId().toString();
        // Since there might be duplicate IDs, we have to be careful with the mapping.
        // Actually, if there are duplicate IDs (e.g., two q-1s), the schedule will just map q-1 to whatever it was. 
        // We will just map the FIRST occurrence of q-1 to the old ID mapping, or map BOTH to new IDs and update schedule carefully.
        // It's simpler: if the old ID wasn't remapped yet, remap it.
        if (!oldToNew[q.id]) {
          oldToNew[q.id] = newId;
        }
        q.id = newId; // we assign the new ID regardless
        updated = true;
      }
    });

    kit.flashcards.forEach(f => {
      if (!mongoose.Types.ObjectId.isValid(f.id)) {
        f.id = new mongoose.Types.ObjectId().toString();
        updated = true;
      }
    });

    if (updated) {
      if (kit.schedule && kit.schedule.days) {
        kit.schedule.days.forEach(day => {
          day.question_ids = day.question_ids.map(id => oldToNew[id] || id);
        });
      }
      
      // Mongoose mixed types need markModified
      kit.markModified('questions');
      kit.markModified('flashcards');
      kit.markModified('schedule');
      await kit.save();
      console.log('Migrated kit', kit._id);
    }
  }
  
  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch(console.error);
