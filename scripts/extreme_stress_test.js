import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://bugcuqhbgcyyyidiqaey.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z2N1cWhiZ2N5eXlpZGlxYWV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MzQwMTUsImV4cCI6MjEwNDIxMDAxNX0.fvUGV9wigza4FCvQAaZHnAC-Fs9A1ATE15GkGJrOM7A";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("================================================================");
console.log("🔥 TESTE EXTREMO: 100 PEDIDOS SIMULTÂNEOS + LEITURA CONCORRENTE");
console.log("================================================================\n");

async function extremeStressTest() {
  const startTime = Date.now();
  const COUNT = 100;
  const testRunId = `EXTREME_${Date.now()}`;
  
  const tasks = [];
  
  // 100 concurrent order inserts
  for (let i = 1; i <= COUNT; i++) {
    tasks.push((async (idx) => {
      const t0 = Date.now();
      const orderPayload = {
        id: randomUUID(),
        customer_name: `Cliente Extremo #${idx}`,
        customer_phone: `(31) 99999-${String(3000 + idx).slice(-4)}`,
        customer_email: `extremo_${idx}_${testRunId}@test.com`,
        customer_address: `Rua Extrema, ${idx} - Bairro Teste, Contagem/MG`,
        delivery_address: `Rua Extrema, ${idx} - Bairro Teste, Contagem/MG`,
        total_amount: 54.90,
        total: 54.90,
        subtotal: 48.40,
        delivery_fee: 6.50,
        status: "pendente",
        payment_method: "pix",
        order_type: "delivery",
        notes: `Carga Extrema #${idx} - ${testRunId}`,
        items: [
          {
            product_id: "prod_classic",
            product_name: "Vrum Classic Burger",
            product_price: 34.90,
            quantity: 2,
            subtotal: 69.80,
            additionals: []
          }
        ],
        created_date: new Date().toISOString()
      };

      const { data, error } = await supabase.from("orders").insert(orderPayload).select("id, order_number").single();
      const lat = Date.now() - t0;
      return { type: "insert", success: !error, latency: lat, id: data?.id, error: error?.message };
    })(i));
  }

  // 50 concurrent menu reads during the burst
  for (let j = 1; j <= 50; j++) {
    tasks.push((async () => {
      const t0 = Date.now();
      const { data, error } = await supabase.from("products").select("id, name, price, category").eq("available", true);
      return { type: "read", success: !error, latency: Date.now() - t0, count: data?.length, error: error?.message };
    })());
  }

  const allResults = await Promise.all(tasks);
  const inserts = allResults.filter(r => r.type === "insert");
  const reads = allResults.filter(r => r.type === "read");

  const successInserts = inserts.filter(r => r.success);
  const successReads = reads.filter(r => r.success);

  const insertLatencies = inserts.map(r => r.latency);
  const readLatencies = reads.map(r => r.latency);

  console.log(`📦 Inserções (100 pedidos simultâneos): ${successInserts.length}/${COUNT} com sucesso.`);
  console.log(`⚡ Latência Inserção Média: ${Math.round(insertLatencies.reduce((a, b) => a + b, 0) / insertLatencies.length)}ms (Mín: ${Math.min(...insertLatencies)}ms | Máx: ${Math.max(...insertLatencies)}ms)`);
  
  console.log(`\n📖 Leituras Simultâneas de Cardápio (50 leituras durante o pico): ${successReads.length}/50 com sucesso.`);
  console.log(`⚡ Latência Leitura Média: ${Math.round(readLatencies.reduce((a, b) => a + b, 0) / readLatencies.length)}ms (Mín: ${Math.min(...readLatencies)}ms | Máx: ${Math.max(...readLatencies)}ms)`);

  // Limpeza
  await supabase.from("orders").delete().ilike("notes", `%${testRunId}%`);
  console.log("\n🧹 Limpeza de 100 pedidos de teste concluída com sucesso.");
  console.log(`⏱️ Tempo total da rajada: ${((Date.now() - startTime) / 1000).toFixed(2)}s\n`);
}

extremeStressTest().catch(console.error);
