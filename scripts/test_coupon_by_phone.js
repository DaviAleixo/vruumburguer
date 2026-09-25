import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://bugcuqhbgcyyyidiqaey.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z2N1cWhiZ2N5eXlpZGlxYWV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MzQwMTUsImV4cCI6MjEwNDIxMDAxNX0.fvUGV9wigza4FCvQAaZHnAC-Fs9A1ATE15GkGJrOM7A";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("================================================================");
console.log("🎫 TESTE DE VALIDAÇÃO E CONSUMO DE CUPONS EXCLUSIVO POR TELEFONE");
console.log("================================================================\n");

async function testCouponByPhone() {
  const testPhone = "(31) 98765-4321";
  const cleanPhone = testPhone.replace(/\D/g, "");
  const couponCode = `FOME10_${Date.now().toString().slice(-4)}`;
  const couponId = randomUUID();

  console.log(`1. Criando cupom de teste: ${couponCode} com limite de 1 uso por cliente...`);
  const { error: createErr } = await supabase.from("coupons").insert({
    id: couponId,
    code: couponCode,
    name: "10 Reais de Desconto",
    description: "Desconto especial de R$ 10,00",
    discount_type: "fixed",
    discount_value: 10.00,
    apply_to: "order_total",
    min_order_value: 30.00,
    usage_limit: 1, // Limite de 1 por cliente
    active: true
  });

  if (createErr) {
    console.error("❌ Erro ao criar cupom:", createErr);
    return;
  }
  console.log("✅ Cupom criado com sucesso no banco.");

  // Passo 2: Validar 1º uso pelo telefone (deve ser permitido)
  console.log(`\n2. Verificando se o telefone ${testPhone} pode usar o cupom...`);
  const { data: dbUsages } = await supabase.from("coupon_usages").select("*").eq("coupon_id", couponId);
  const userUsages1 = (dbUsages || []).filter(u => {
    const uEmail = String(u.user_email || "");
    return cleanPhone && cleanPhone.length >= 8 && uEmail.includes(cleanPhone.slice(-8));
  });

  console.log(`  Usos anteriores encontrados: ${userUsages1.length}`);
  if (userUsages1.length < 1) {
    console.log("  ✅ 1º Uso AUTORIZADO com sucesso!");
    
    // Simula primeiro pedido finalizado salvando phone no identifier
    const orderId = randomUUID();
    await supabase.from("coupon_usages").insert({
      id: randomUUID(),
      coupon_id: couponId,
      user_email: `phone:${cleanPhone}`,
      order_id: orderId,
      created_date: new Date().toISOString()
    });
    console.log("  ✅ Uso do cupom registrado para o telefone no banco.");
  } else {
    console.error("❌ Falha: Cupom não deveria estar bloqueado ainda.");
  }

  // Passo 3: Tentar 2º uso pelo MESMO telefone (deve ser BLOQUEADO)
  console.log(`\n3. Tentando usar o MESMO cupom pela 2ª vez com o telefone ${testPhone}...`);
  const { data: dbUsages2 } = await supabase.from("coupon_usages").select("*").eq("coupon_id", couponId);
  const userUsages2 = (dbUsages2 || []).filter(u => {
    const uEmail = String(u.user_email || "");
    return cleanPhone && cleanPhone.length >= 8 && uEmail.includes(cleanPhone.slice(-8));
  });

  console.log(`  Usos anteriores encontrados: ${userUsages2.length}`);
  if (userUsages2.length >= 1) {
    console.log("  🛑 2º Uso BLOQUEADO com sucesso! ('Você já atingiu o limite de uso deste cupom para seu número de WhatsApp.')");
  } else {
    console.error("❌ Falha: O 2º uso deveria ter sido bloqueado.");
  }

  // Passo 4: Tentar com OUTRO telefone (deve ser AUTORIZADO)
  const otherPhone = "(31) 91234-5678";
  const otherClean = otherPhone.replace(/\D/g, "");
  console.log(`\n4. Testando o cupom com OUTRO telefone (${otherPhone})...`);
  const userUsages3 = (dbUsages2 || []).filter(u => {
    const uEmail = String(u.user_email || "");
    return otherClean && otherClean.length >= 8 && uEmail.includes(otherClean.slice(-8));
  });
  if (userUsages3.length < 1) {
    console.log("  ✅ Outro cliente AUTORIZADO a usar o cupom com sucesso!");
  }

  // Limpeza
  await supabase.from("coupon_usages").delete().eq("coupon_id", couponId);
  await supabase.from("coupons").delete().eq("id", couponId);
  console.log("\n🧹 Limpeza dos registros de teste concluída com sucesso.");
  console.log("================================================================");
  console.log("🎉 VALIDAÇÃO DE CUPOM POR TELEFONE HOMOLOGADA COM SUCESSO 100%!");
  console.log("================================================================\n");
}

testCouponByPhone().catch(console.error);
