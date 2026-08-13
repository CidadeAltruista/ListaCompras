import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://szpdeaglpasesughkqfp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gtux-Tyi59VPcfVRNecrUQ_cYTUqCvU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let cabecalhoAtual = [];
let artigosPorId = new Map();

function ordenarAlojamentos(artigos) {
  const nomes = [];
  const vistos = new Set();

  for (const artigo of artigos) {
    const dados = artigo.dados || {};
    for (const nome of Object.keys(dados)) {
      if (!vistos.has(nome)) {
        vistos.add(nome);
        nomes.push(nome);
      }
    }
  }

  return nomes;
}

function paraMatriz(artigos) {
  const alojamentos = ordenarAlojamentos(artigos);
  const cabecalho = ['Categoria', 'Artigo'];
  const segundaLinha = ['', ''];

  for (const nome of alojamentos) {
    cabecalho.push(nome, `${nome} qtd`);
    segundaLinha.push('', '');
  }

  cabecalhoAtual = cabecalho;
  artigosPorId = new Map(artigos.map((artigo) => [artigo.id, artigo]));

  const linhas = artigos.map((artigo) => {
    const row = [artigo.categoria || 'Outros', artigo.nome || ''];
    const dados = artigo.dados || {};

    for (const nome of alojamentos) {
      row.push(dados[nome]?.estado || '', dados[nome]?.quantidade || '0');
    }

    return row;
  });

  return {
    dados: [cabecalho, segundaLinha, ...linhas],
    rows: [null, null, ...artigos.map((artigo) => artigo.id)],
  };
}

export async function obterDados() {
  const { data, error } = await supabase
    .from('artigos')
    .select('id,categoria,nome,dados')
    .order('categoria', { ascending: true })
    .order('nome', { ascending: true });

  if (error) throw error;
  return paraMatriz(data || []);
}

export async function adicionarArtigo(nome, categoria = 'Outros') {
  const dados = {};

  for (let i = 2; i < cabecalhoAtual.length; i += 2) {
    const alojamento = cabecalhoAtual[i];
    if (alojamento) dados[alojamento] = { estado: '', quantidade: '0' };
  }

  const { error } = await supabase
    .from('artigos')
    .insert({ categoria, nome, dados });

  if (error) throw error;
}

export async function apagarArtigo(id) {
  const { error } = await supabase
    .from('artigos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function atualizarCelula(id, coluna, valor) {
  const artigo = artigosPorId.get(id);
  if (!artigo) throw new Error(`Artigo nao encontrado: ${id}`);

  const colIndex = coluna - 1;

  if (colIndex === 0) {
    artigo.categoria = valor;
    const { error } = await supabase
      .from('artigos')
      .update({ categoria: valor })
      .eq('id', id);
    if (error) throw error;
    return;
  }

  if (colIndex === 1) {
    artigo.nome = valor;
    const { error } = await supabase
      .from('artigos')
      .update({ nome: valor })
      .eq('id', id);
    if (error) throw error;
    return;
  }

  const dados = structuredClone(artigo.dados || {});
  const isEstado = colIndex % 2 === 0;
  const alojamento = isEstado ? cabecalhoAtual[colIndex] : cabecalhoAtual[colIndex - 1];

  if (!alojamento) throw new Error(`Coluna sem alojamento: ${coluna}`);
  if (!dados[alojamento]) dados[alojamento] = { estado: '', quantidade: '0' };

  if (isEstado) dados[alojamento].estado = valor;
  else dados[alojamento].quantidade = valor || '0';

  artigo.dados = dados;

  const { error } = await supabase
    .from('artigos')
    .update({ dados })
    .eq('id', id);

  if (error) throw error;
}
