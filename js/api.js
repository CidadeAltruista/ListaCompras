const apiBase = location.hostname === 'localhost' && location.port === '5174'
  ? ''
  : 'https://br-quiet-fire-b9gat2m9-listacompras.compute.c-7.eu-central-1.aws.neon.tech';

let cabecalhoAtual = [];

async function pedido(url, method = 'GET', body) {
  const response = await fetch(`${apiBase}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Erro ao comunicar com a base de dados (${response.status})`);
  return response.json();
}

export async function obterDados() {
  const artigos = await pedido('/api/artigos');
  const alojamentos = [...new Set(artigos.flatMap(artigo => Object.keys(artigo.dados || {})))];
  const cabecalho = ['Categoria', 'Artigo'];
  const segundaLinha = ['', ''];
  for (const nome of alojamentos) {
    cabecalho.push(nome, `${nome} qtd`);
    segundaLinha.push('', '');
  }
  cabecalhoAtual = cabecalho;
  const linhas = artigos.map(artigo => {
    const row = [artigo.categoria || 'Outros', artigo.nome || ''];
    for (const nome of alojamentos) row.push(artigo.dados?.[nome]?.estado || '', artigo.dados?.[nome]?.quantidade || '0');
    return row;
  });
  return { dados: [cabecalho, segundaLinha, ...linhas], rows: [null, null, ...artigos.map(artigo => artigo.id)] };
}

export async function adicionarArtigo(nome, categoria = 'Outros') {
  const dados = {};
  for (let i = 2; i < cabecalhoAtual.length; i += 2) {
    if (cabecalhoAtual[i]) dados[cabecalhoAtual[i]] = { estado: '', quantidade: '0' };
  }
  return pedido('/api/artigos', 'POST', { nome, categoria, dados });
}

export async function apagarArtigo(id) {
  return pedido(`/api/artigos/${id}`, 'DELETE');
}

export async function atualizarCelula(id, coluna, valor, nomeAlojamento) {
  const index = coluna - 1;
  const campo = index === 0 ? 'categoria' : index === 1 ? 'nome' : index % 2 === 0 ? 'estado' : 'quantidade';
  return pedido(`/api/artigos/${id}`, 'PATCH', {
    campo,
    valor: campo === 'quantidade' ? valor || '0' : valor,
    alojamento: nomeAlojamento,
  });
}
