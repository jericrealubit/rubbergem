// migrate.js
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

// 1. Load your credentials
const SUPABASE_URL = ""; // Replace with your URL
const SUPABASE_SERVICE_KEY = ""; // Replace with your Service Role Key

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  // 2. Read your existing data
  const rawData = fs.readFileSync("./public/rubbergem/data/data.json", "utf8");
  const jsonData = JSON.parse(rawData);

  console.log(`Starting migration of ${jsonData.length} records...`);

  // 3. Map and Insert
  for (const entry of jsonData) {
    const { data, error } = await supabase.from("production_logs").insert([
      {
        date: entry.date,
        machine_press: entry.machine_press,
        operator_shift: entry.operator_shift,
        total_mats_produced: entry.total_mats_produced,
        faulty_mats_produced: entry.faulty_mats_produced,
        table_line_output_yields: entry.table_line_output_yields,
        cycles: entry.cycles,
      },
    ]);

    if (error) {
      console.error(`Error migrating date ${entry.date}:`, error.message);
    } else {
      console.log(`Successfully migrated: ${entry.date}`);
    }
  }

  console.log("Migration complete.");
}

runMigration();
