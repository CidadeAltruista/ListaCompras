const SHEET_URL =
  'https://script.google.com/macros/s/AKfycbyVUwW8_VNHxgutACoBX5cWAqJwxyIPZX1dwrGsSYD1FsLG1pdw_MGt9tjY4WxZEZMs/exec';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const replaceExisting = process.argv.includes('--replace');

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltam variaveis: SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY.');
  process.exit(1);
}

const restUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/artigos`;

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${options.method || 'GET'} ${url} falhou: ${res.status} ${body}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function normalizarQuantidade(valor) {
  if (valor === undefined || valor === null || valor === '') return '0';
  return String(valor);
}

function converterDados(dados) {
  if (!Array.isArray(dados) || dados.length < 3) {
    throw new Error('Formato inesperado vindo da Sheet: esperado json.dados com cabecalho e linhas.');
  }

  const cabecalho = dados[0];
  const alojamentos = [];

  for (let i = 2; i < cabecalho.length; i += 2) {
    if (!cabecalho[i]) continue;
    alojamentos.push({
      nome: String(cabecalho[i]).trim(),
      estadoCol: i,
      quantidadeCol: i + 1,
    });
  }

  return dados
    .slice(2)
    .filter((row) => row && row[1])
    .map((row) => {
      const porAlojamento = {};

      for (const alojamento of alojamentos) {
        porAlojamento[alojamento.nome] = {
          estado: row[alojamento.estadoCol] || '',
          quantidade: normalizarQuantidade(row[alojamento.quantidadeCol]),
        };
      }

      return {
        categoria: row[0] || 'Outros',
        nome: row[1],
        dados: porAlojamento,
      };
    });
}

async function main() {
  console.log('A ler dados da Google Sheet...');
  const sheetRes = await fetch(SHEET_URL);
  if (!sheetRes.ok) {
    throw new Error(`Falha ao ler Sheet: ${sheetRes.status} ${await sheetRes.text()}`);
  }

  const sheetJson = await sheetRes.json();
  const artigos = converterDados(sheetJson.dados);

  console.log(`Encontrados ${artigos.length} artigos para importar.`);
  if (replaceExisting) {
    console.log('A limpar tabela artigos no Supabase...');
    await request(`${restUrl}?id=gte.0`, { method: 'DELETE' });
  }

  console.log('A inserir artigos no Supabase...');
  const batchSize = 500;
  for (let i = 0; i < artigos.length; i += batchSize) {
    const batch = artigos.slice(i, i + batchSize);
    await request(restUrl, {
      method: 'POST',
      body: JSON.stringify(batch),
    });
    console.log(`Importados ${Math.min(i + batch.length, artigos.length)}/${artigos.length}`);
  }

  console.log('Importacao concluida.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
