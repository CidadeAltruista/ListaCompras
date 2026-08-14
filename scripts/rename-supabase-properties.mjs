const SUPABASE_URL = 'https://szpdeaglpasesughkqfp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gtux-Tyi59VPcfVRNecrUQ_cYTUqCvU';

const RENAMES = new Map([
  ['V.181A', '181-A'],
  ['V.181B', '181-B'],
  ['V.230B', '230-A'],
  ['Sta Catarina', 'Sta Cat.'],
]);

const restUrl = `${SUPABASE_URL}/rest/v1/artigos`;

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${url} falhou: ${res.status} ${await res.text()}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function renameDados(dados) {
  let changed = false;
  const next = { ...(dados || {}) };

  for (const [oldName, newName] of RENAMES) {
    if (!Object.prototype.hasOwnProperty.call(next, oldName)) continue;

    if (!Object.prototype.hasOwnProperty.call(next, newName)) {
      next[newName] = next[oldName];
    }
    delete next[oldName];
    changed = true;
  }

  return { changed, dados: next };
}

async function main() {
  const artigos = await request(`${restUrl}?select=id,nome,dados&order=id.asc`);
  let updated = 0;

  for (const artigo of artigos) {
    const renamed = renameDados(artigo.dados);
    if (!renamed.changed) continue;

    await request(`${restUrl}?id=eq.${artigo.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ dados: renamed.dados }),
    });
    updated += 1;
  }

  console.log(`Propriedades renomeadas em ${updated} artigo(s).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
