const SUPABASE_URL = 'https://szpdeaglpasesughkqfp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gtux-Tyi59VPcfVRNecrUQ_cYTUqCvU';
const restUrl = `${SUPABASE_URL}/rest/v1/artigos`;

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} falhou: ${response.status} ${await response.text()}`);
  }
  return response.status === 204 ? null : response.json();
}

async function main() {
  const articles = await request(`${restUrl}?select=id,dados&order=id.asc`);
  let updated = 0;

  for (const article of articles) {
    const dados = article.dados || {};
    if (Object.prototype.hasOwnProperty.call(dados, 'Bolhão')) continue;

    await request(`${restUrl}?id=eq.${article.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ dados: { ...dados, 'Bolhão': { estado: '', quantidade: '0' } } }),
    });
    updated += 1;
  }

  console.log(`Bolhão adicionado a ${updated} artigo(s).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
