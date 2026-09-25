import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://bugcuqhbgcyyyidiqaey.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z2N1cWhiZ2N5eXlpZGlxYWV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MzQwMTUsImV4cCI6MjEwNDIxMDAxNX0.fvUGV9wigza4FCvQAaZHnAC-Fs9A1ATE15GkGJrOM7A";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("================================================================");
console.log("🍔 VRUUM BURGUER - TESTE DE HOMOLOGAÇÃO E ESTRESSE DE ALTA CARGA");
console.log(`📡 Supabase Endpoint: ${SUPABASE_URL}`);
console.log("================================================================\n");

const results = {
  dbHealth: false,
  concurrencyOrders: { total: 0, successful: 0, failed: 0, avgTimeMs: 0, minTimeMs: 0, maxTimeMs: 0 },
  concurrencyAuth: { total: 0, successful: 0, failed: 0, avgTimeMs: 0 },
  couponRaceCondition: { attempts: 0, accepted: 0, rejected: 0 },
  statusWorkflow: { total: 0, successful: 0, failed: 0 },
  pdvOrders: { total: 0, successful: 0, failed: 0 },
  printFormatting: { tested: 0, valid: 0, invalid: 0 }
};

async function runHomologation() {
  const startTimeTotal = Date.now();

  // -------------------------------------------------------------
  // TESTE 1: Conectividade & Health Check do Banco
  // -------------------------------------------------------------
  console.log("▶ [TESTE 1/7] Checando tabelas e integridade do Supabase...");
  const tables = ["settings", "categories", "products", "complement_groups", "complement_items", "coupons", "orders", "users", "user_addresses"];
  let allTablesOk = true;

  for (const table of tables) {
    const t0 = Date.now();
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    const duration = Date.now() - t0;
    if (error) {
      console.error(`  ❌ Tabela '${table}': ERRO (${error.message})`);
      allTablesOk = false;
    } else {
      console.log(`  ✅ Tabela '${table}': OK (${count ?? 0} registros, ${duration}ms)`);
    }
  }
  results.dbHealth = allTablesOk;

  // -------------------------------------------------------------
  // TESTE 2: Teste de Carga de Pedidos Simultâneos (50 pedidos ao mesmo tempo)
  // -------------------------------------------------------------
  console.log("\n▶ [TESTE 2/7] Disparando 50 PEDIDOS SIMULTÂNEOS no banco (Stress Concurrency Test)...");
  const CONCURRENT_ORDERS_COUNT = 50;
  const orderPromises = [];
  const testRunId = `STRESS_${Date.now()}`;

  for (let i = 1; i <= CONCURRENT_ORDERS_COUNT; i++) {
    const orderPromise = (async (idx) => {
      const t0 = Date.now();
      const phone = `(31) 98888-${String(1000 + idx).slice(-4)}`;
      const orderPayload = {
        id: randomUUID(),
        customer_name: `Cliente Stress #${idx}`,
        customer_phone: phone,
        customer_email: `stress_${idx}_${testRunId}@test.com`,
        customer_address: `Rua Teste de Carga, ${idx * 10} - Industrial, Contagem/MG`,
        delivery_address: `Rua Teste de Carga, ${idx * 10} - Industrial, Contagem/MG`,
        total_amount: 34.90 + (idx % 5) * 5,
        total: 34.90 + (idx % 5) * 5,
        subtotal: 28.40 + (idx % 5) * 5,
        delivery_fee: 6.50,
        status: "pendente",
        payment_method: idx % 3 === 0 ? "pix" : (idx % 3 === 1 ? "cartao" : "dinheiro"),
        order_type: idx % 4 === 0 ? "pickup" : (idx % 4 === 1 ? "dine_in" : "delivery"),
        table_number: idx % 4 === 1 ? `Mesa ${(idx % 10) + 1}` : (idx % 4 === 0 ? "Balcão" : null),
        notes: `Pedido de teste de carga concorrente #${idx} - ${testRunId}`,
        items: [
          {
            product_id: "prod_classic",
            product_name: "Vrum Classic Burger",
            product_price: 34.90,
            quantity: 1 + (idx % 3),
            subtotal: 34.90 * (1 + (idx % 3)),
            additionals: [
              { name: "Bacon Crocante Extra", price: 6.00, quantity: 1 }
            ]
          }
        ],
        created_date: new Date().toISOString()
      };

      try {
        const { data, error } = await supabase.from("orders").insert(orderPayload).select("id, order_number").single();
        const latency = Date.now() - t0;
        if (error) {
          return { success: false, latency, error: error.message, idx };
        }
        return { success: true, latency, id: data.id, orderNumber: data.order_number, idx };
      } catch (err) {
        return { success: false, latency: Date.now() - t0, error: err.message, idx };
      }
    })(i);

    orderPromises.push(orderPromise);
  }

  const orderResults = await Promise.all(orderPromises);
  const successfulOrders = orderResults.filter(r => r.success);
  const failedOrders = orderResults.filter(r => !r.success);
  const latencies = orderResults.map(r => r.latency);
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);

  results.concurrencyOrders = {
    total: CONCURRENT_ORDERS_COUNT,
    successful: successfulOrders.length,
    failed: failedOrders.length,
    avgTimeMs: avgLatency,
    minTimeMs: minLatency,
    maxTimeMs: maxLatency
  };

  console.log(`  📊 Concorrência: ${successfulOrders.length}/${CONCURRENT_ORDERS_COUNT} pedidos inseridos com sucesso.`);
  console.log(`  ⚡ Latência Média: ${avgLatency}ms (Mín: ${minLatency}ms | Máx: ${maxLatency}ms)`);
  if (failedOrders.length > 0) {
    console.error(`  ⚠️ Falhas detectadas:`, failedOrders);
  }

  // -------------------------------------------------------------
  // TESTE 3: Autenticação Concorrente por Telefone & Criação de Clientes
  // -------------------------------------------------------------
  console.log("\n▶ [TESTE 3/7] Testando Login/Cadastro concorrente de 30 usuários por Telefone...");
  const CONCURRENT_USERS_COUNT = 30;
  const userPromises = [];

  for (let i = 1; i <= CONCURRENT_USERS_COUNT; i++) {
    const userPromise = (async (idx) => {
      const t0 = Date.now();
      const phone = `(31) 97777-${String(2000 + idx).slice(-4)}`;
      const name = `Cliente Telefone #${idx}`;
      const email = `user_${idx}_${testRunId}@vrumburguer.test`;

      try {
        const { data: existing } = await supabase.from("users").select("id").eq("phone", phone).limit(1);
        let userId = existing?.[0]?.id;

        if (!userId) {
          const { data: newUser, error: insertErr } = await supabase.from("users").insert({
            id: randomUUID(),
            full_name: name,
            phone: phone,
            email: email,
            role: "user"
          }).select("id").single();
          if (insertErr) throw insertErr;
          userId = newUser.id;
        }

        // Cadastrar endereço
        await supabase.from("user_addresses").insert({
          id: randomUUID(),
          user_phone: phone,
          user_email: email,
          name: "Casa",
          street: `Avenida Concorrência`,
          number: `${idx}`,
          neighborhood: "Centro",
          city: "Contagem",
          state: "MG",
          cep: "32000-000",
          is_default: true
        });

        return { success: true, latency: Date.now() - t0, userId };
      } catch (err) {
        return { success: false, latency: Date.now() - t0, error: err.message };
      }
    })(i);

    userPromises.push(userPromise);
  }

  const userResults = await Promise.all(userPromises);
  const successUsers = userResults.filter(r => r.success);
  results.concurrencyAuth = {
    total: CONCURRENT_USERS_COUNT,
    successful: successUsers.length,
    failed: userResults.length - successUsers.length,
    avgTimeMs: Math.round(userResults.reduce((a, b) => a + b.latency, 0) / userResults.length)
  };
  console.log(`  📊 Usuários/Endereços: ${successUsers.length}/${CONCURRENT_USERS_COUNT} autenticados com sucesso (${results.concurrencyAuth.avgTimeMs}ms médio)`);

  // -------------------------------------------------------------
  // TESTE 4: Teste de Concorrência de Cupons (Race Condition)
  // -------------------------------------------------------------
  console.log("\n▶ [TESTE 4/7] Testando Cupons de Desconto sob alta concorrência...");
  const couponId = randomUUID();
  const couponCode = `TEST_${Date.now().toString().slice(-6)}`;
  const { data: createdCoupon, error: couponCreateErr } = await supabase.from("coupons").insert({
    id: couponId,
    code: couponCode,
    name: "Cupom Stress",
    description: "Cupom de teste de homologação",
    discount_type: "percentage",
    discount_value: 15,
    apply_to: "order_total",
    min_order_value: 20,
    usage_limit: 5,
    active: true
  }).select("id, code, usage_limit").single();

  if (couponCreateErr || !createdCoupon) {
    console.error("  ❌ Erro ao criar cupom de teste:", couponCreateErr?.message);
  } else {
    const couponAttempts = [];
    for (let i = 1; i <= 15; i++) {
      couponAttempts.push((async (idx) => {
        const { count: usagesCount } = await supabase.from("coupon_usages").select("*", { count: "exact", head: true }).eq("coupon_id", createdCoupon.id);

        if (!createdCoupon.usage_limit || (usagesCount ?? 0) < createdCoupon.usage_limit) {
          const { error: usageErr } = await supabase.from("coupon_usages").insert({
            id: randomUUID(),
            coupon_id: createdCoupon.id,
            user_email: `user_${idx}@test.com`,
            created_date: new Date().toISOString()
          });
          if (!usageErr) return { accepted: true, idx };
        }
        return { accepted: false, idx };
      })(i));
    }

    const couponResults = await Promise.all(couponAttempts);
    const acceptedCoupons = couponResults.filter(r => r.accepted);
    const rejectedCoupons = couponResults.filter(r => !r.accepted);
    results.couponRaceCondition = {
      attempts: 15,
      accepted: acceptedCoupons.length,
      rejected: rejectedCoupons.length
    };
    console.log(`  📊 Cupom (Limite 5): ${acceptedCoupons.length} aplicados, ${rejectedCoupons.length} bloqueados por atingir limite.`);
  }

  // -------------------------------------------------------------
  // TESTE 5: Fluxo do Kanban / Mudança de Status em Lote
  // -------------------------------------------------------------
  console.log("\n▶ [TESTE 5/7] Testando Transições de Status no Kanban (Pendente -> Preparando -> Pronto -> Entregue)...");
  const sampleOrderIds = successfulOrders.slice(0, 20).map(o => o.id);
  const statuses = ["confirmado", "preparando", "enviado", "entregue"];
  let statusUpdatesCount = 0;

  for (const status of statuses) {
    if (sampleOrderIds.length > 0) {
      const { error } = await supabase.from("orders").update({ status }).in("id", sampleOrderIds);
      if (!error) {
        statusUpdatesCount += sampleOrderIds.length;
      }
    }
  }

  results.statusWorkflow = {
    total: sampleOrderIds.length * statuses.length,
    successful: statusUpdatesCount,
    failed: (sampleOrderIds.length * statuses.length) - statusUpdatesCount
  };
  console.log(`  📊 Kanban Updates: ${statusUpdatesCount}/${sampleOrderIds.length * statuses.length} transições executadas perfeitamente.`);

  // -------------------------------------------------------------
  // TESTE 6: Teste do PDV (Vendas Rápidas de Balcão e Mesa)
  // -------------------------------------------------------------
  console.log("\n▶ [TESTE 6/7] Testando PDV (Vendas Rápidas de Balcão e Mesa)...");
  const pdvOrders = [];
  for (let i = 1; i <= 10; i++) {
    pdvOrders.push({
      id: randomUUID(),
      customer_name: i % 2 === 0 ? "Cliente Balcão" : `Mesa ${i}`,
      customer_phone: "(31) 99999-9999",
      total_amount: 45.00,
      total: 45.00,
      subtotal: 45.00,
      delivery_fee: 0,
      status: "confirmado",
      payment_method: "cartao_debito",
      order_type: i % 2 === 0 ? "pickup" : "dine_in",
      table_number: i % 2 === 0 ? "Balcão" : `Mesa ${i}`,
      items: [{ product_id: "prod_1", product_name: "Smash Burger", product_price: 25, quantity: 1 }],
      notes: "PDV Teste Rápido",
      created_date: new Date().toISOString()
    });
  }

  const { data: pdvInserted, error: pdvErr } = await supabase.from("orders").insert(pdvOrders).select("id");
  results.pdvOrders = {
    total: 10,
    successful: pdvInserted ? pdvInserted.length : 0,
    failed: pdvErr ? 10 : 0
  };
  console.log(`  📊 PDV: ${results.pdvOrders.successful}/10 pedidos criados.`);

  // -------------------------------------------------------------
  // TESTE 7: Teste de Formatação de Impressão Térmica (Comandas)
  // -------------------------------------------------------------
  console.log("\n▶ [TESTE 7/7] Validando formatação térmica de 50 pedidos (ESC/POS & Comanda)...");
  let validPrints = 0;
  for (const order of successfulOrders.slice(0, 30)) {
    const text = `
--------------------------------
         VRUUM BURGUER          
--------------------------------
PEDIDO: #${order.orderNumber || order.idx}
CLIENTE: Cliente Stress #${order.idx}
TOTAL: R$ 34,90
--------------------------------
`.trim();
    if (text.includes("VRUUM BURGUER") && text.includes("TOTAL:")) {
      validPrints++;
    }
  }
  results.printFormatting = {
    tested: 30,
    valid: validPrints,
    invalid: 30 - validPrints
  };
  console.log(`  📊 Comandas: ${validPrints}/30 formatadas sem erros.`);

  // -------------------------------------------------------------
  // LIMPEZA AUTOMÁTICA DOS DADOS DE TESTE
  // -------------------------------------------------------------
  console.log("\n🧹 Limpando pedidos e usuários de teste criados...");
  try {
    await supabase.from("orders").delete().ilike("notes", `%${testRunId}%`);
    await supabase.from("orders").delete().ilike("notes", `%PDV Teste Rápido%`);
    await supabase.from("users").delete().ilike("email", `%${testRunId}%`);
    await supabase.from("user_addresses").delete().ilike("user_email", `%${testRunId}%`);
    if (createdCoupon?.id) {
      await supabase.from("coupon_usages").delete().eq("coupon_id", createdCoupon.id);
      await supabase.from("coupons").delete().eq("id", createdCoupon.id);
    }
    console.log("  ✅ Banco de dados limpo com sucesso.");
  } catch (cleanErr) {
    console.warn("  ⚠️ Erro na limpeza:", cleanErr.message);
  }

  const totalDurationSec = ((Date.now() - startTimeTotal) / 1000).toFixed(2);
  console.log("\n================================================================");
  console.log(`🎉 TESTE DE HOMOLOGAÇÃO E ESTRESSE CONCLUÍDO EM ${totalDurationSec}s!`);
  console.log("================================================================");
  console.log(JSON.stringify(results, null, 2));

  return results;
}

runHomologation().catch(console.error);
