import { criarTabela, atualizarEstado, toggleModoEdicao } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('main.js carregado');

  const sheetURL = 'https://script.google.com/macros/s/AKfycbyVUwW8_VNHxgutACoBX5cWAqJwxyIPZX1dwrGsSYD1FsLG1pdw_MGt9tjY4WxZEZMs/exec';

  let dadosComAlteracoes  = [];
  let rowIndicesAtuais    = [];

  /**
   * Normaliza texto: remove acentos e põe em lowercase
   */
  function normalizeText(str) {
    return str.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase();
  }

  /**
   * Faz fetch ao Sheets, atualiza os arrays de dados e renderiza
   */
  async function carregarDados() {
    atualizarEstado('A carregar dados...');
    try {
      const resposta = await fetch(sheetURL);
      const json = await resposta.json();

      // Guarda dados e índices
      dadosComAlteracoes = JSON.parse(JSON.stringify(json.dados));
      rowIndicesAtuais   = dadosComAlteracoes.map((_, i) => i + 1);

      criarTabela(dadosComAlteracoes, rowIndicesAtuais);
      atualizarEstado('Pronto');
    } catch (e) {
      console.error(e);
      atualizarEstado('Erro ao carregar dados.');
    }
  }

  /**
   * Recarrega dados e exibe apenas as linhas com Estado = 'F'
   */
  async function filtrarFaltas() {
    atualizarEstado('A aplicar filtro de faltas...');
    await carregarDados();

    const filtradosCells = [dadosComAlteracoes[0], dadosComAlteracoes[1]];
    const filtradosRows  = [rowIndicesAtuais[0], rowIndicesAtuais[1]];

    for (let i = 2; i < dadosComAlteracoes.length; i++) {
      const linha = dadosComAlteracoes[i];
      for (let j = 2; j < linha.length; j += 2) {
        if (linha[j] === 'F') {
          filtradosCells.push(linha);
          filtradosRows.push(rowIndicesAtuais[i]);
          break;
        }
      }
    }

    criarTabela(filtradosCells, filtradosRows);
    atualizarEstado('Pronto');
  }

  /**
   * Recarrega dados e mostra todas as linhas
   */
  async function mostrarTudo() {
    atualizarEstado('A mostrar todos os dados...');
    await carregarDados();
  }

  // Ligar os botões
  document.getElementById('mostrarFaltas').addEventListener('click', filtrarFaltas);
  document.getElementById('mostrarTudo').addEventListener('click', mostrarTudo);
  document.getElementById('modoEdicao').addEventListener('click', toggleModoEdicao);

  /**
   * Campo de pesquisa de artigos
   */
  const searchInput   = document.getElementById('searchInput');
  const suggestionsEl = document.getElementById('suggestions');

  searchInput.addEventListener('input', () => {
    const term = normalizeText(searchInput.value.trim());
    suggestionsEl.innerHTML = '';

    if (!term) return;

    const resultados = [];
    for (let i = 2; i < dadosComAlteracoes.length; i++) {
      const artigo = dadosComAlteracoes[i][1];
      if (!artigo) continue;

      const norm = normalizeText(String(artigo));
      const idx  = norm.indexOf(term);
      if (idx !== -1) {
        resultados.push({ idx, artigo, rowIdx: rowIndicesAtuais[i], cells: dadosComAlteracoes[i] });
      }
    }

    resultados
      .sort((a, b) => a.idx - b.idx)
      .slice(0, 5)
      .forEach(({ artigo, rowIdx, cells }) => {
        const li = document.createElement('li');
        li.textContent = artigo;
        li.className = 'px-3 py-1 hover:bg-gray-200 cursor-pointer';
        li.addEventListener('click', () => {
          // Ao clicar, mostra apenas esta linha
          criarTabela(
            [dadosComAlteracoes[0], dadosComAlteracoes[1], cells],
            [rowIndicesAtuais[0], rowIndicesAtuais[1], rowIdx]
          );
          suggestionsEl.innerHTML = '';
          searchInput.value = '';
        });
        suggestionsEl.appendChild(li);
      });
  });

  // Inicia carregamento principal
  carregarDados();
});
