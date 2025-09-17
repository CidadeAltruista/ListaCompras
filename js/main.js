import {
  criarTabela,
  atualizarEstado,
  toggleModoEdicao
} from './ui.js';
import { atualizarCelula } from './api.js';  // 👍 necessário para o “➕ Adicionar”

document.addEventListener('DOMContentLoaded', () => {
  const sheetURL = 'https://script.google.com/macros/s/AKfycbyVUwW8_VNHxgutACoBX5cWAqJwxyIPZX1dwrGsSYD1FsLG1pdw_MGt9tjY4WxZEZMs/exec';

  let dados = [], rows = [];

  function normalizeText(s) {
    return s.normalize('NFD')
            .replace(/[\u0300-\u036f]/g,'')
            .toLowerCase();
  }

  async function carregarDados() {
    atualizarEstado('A carregar dados...');
    try {
      const res   = await fetch(sheetURL);
      const texto = await res.text();
      const json  = JSON.parse(texto);
      dados = JSON.parse(JSON.stringify(json.dados));
      rows  = dados.map((_,i) => i+1);
      criarTabela(dados, rows);
      updateStickyOffset();
      atualizarEstado('Pronto');
    } catch (e) {
      console.error('Erro no carregarDados():', e);
      atualizarEstado('Erro ao carregar dados.');
    }
    window.TODAS_CATEGORIAS = [...new Set(dados.slice(2).map(row => row[0]).filter(Boolean))];
  }

  async function filtrarFaltas() {
    atualizarEstado('A aplicar filtro...');
    await carregarDados();
    const c = [dados[0], dados[1]], r = [rows[0], rows[1]];
    for (let i = 2; i < dados.length; i++) {
      for (let j = 2; j < dados[i].length; j += 2) {
        if (dados[i][j] === 'F' || dados[i][j] === 'C') {
          c.push(dados[i]);
          r.push(rows[i]);
          break;
        }
      }
    }
    criarTabela(c, r);
    updateStickyOffset();
    atualizarEstado('Pronto');
  }

  async function mostrarTudo() {
    atualizarEstado('A mostrar todos...');
    await carregarDados();
  }
  
// após as tuas outras funções de filtro, p.ex. filtrarFaltas()

async function filtrarComprados() {
  atualizarEstado('A filtrar artigos COMPRADOS…');
  // Recarrega dados originais
  await carregarDados();            // garante que `dados` e `rows` estão frescos
  const filteredData = [dados[0], dados[1]];
  const filteredRows = [rows[0], rows[1]];

  // percorre cada linha (começando em 2) e verifica se existe 'C' no array dos estados
  for (let i = 2; i < dados.length; i++) {
    let comprado = false;
    // os estados estão nas colunas pares a partir de j=2
    for (let j = 2; j < dados[i].length; j += 2) {
      if (dados[i][j] === 'C') {
        comprado = true;
        break;
      }
    }
    if (comprado) {
      filteredData.push(dados[i]);
      filteredRows.push(rows[i]);
    }
  }

  // redesenha a tabela só com os “C”
  criarTabela(filteredData, filteredRows);
  updateStickyOffset();
  atualizarEstado('Pronto');
}

// liga o botão “Mostrar Comprados”
document
  .getElementById('mostrarComprados')
  .addEventListener('click', filtrarComprados);


  // Botões
  document.getElementById('mostrarFaltas').addEventListener('click', filtrarFaltas);
  document.getElementById('mostrarTudo').addEventListener('click', mostrarTudo);
  document.getElementById('modoEdicao').addEventListener('click', () => {
    toggleModoEdicao();                          // faz o que já fazia
    document.body.classList.toggle('modo-edicao'); // marca o <body> para o CSS mostrar/ocultar a coluna X
  });


  // Pesquisa
  const inp = document.getElementById('searchInput');
  const sug = document.getElementById('suggestions');

  inp.addEventListener('input', () => {
    const term = normalizeText(inp.value.trim());
    sug.innerHTML = '';
    if (!term) return;

    // 1) hits
    const hits = [];
    for (let i = 2; i < dados.length; i++) {
      const art = dados[i][1];
      if (!art) continue;
      const norm = normalizeText(art);
      const idx  = norm.indexOf(term);
      if (idx !== -1) hits.push({ idx, i, art });
    }
    hits
      .sort((a,b) => a.idx - b.idx)
      .slice(0,5)
      .forEach(h => {
        const li = document.createElement('li');
        li.textContent = h.art;
        li.className = 'px-2 py-1 hover:bg-gray-200 cursor-pointer text-xs';
        li.addEventListener('click', () => {
          criarTabela(
            [dados[0], dados[1], dados[h.i]],
            [rows[0], rows[1], rows[h.i]]
          );
          updateStickyOffset();
          sug.innerHTML = '';
          inp.value     = '';
        });
        sug.appendChild(li);
      });

    // 2) opção “➕ Adicionar” (só em modo edição)
    if (document.body.classList.contains('modo-edicao')) {
      const nome = inp.value.trim();
      if (nome) {
        const liAdd = document.createElement('li');
        liAdd.textContent = `➕ Adicionar “${nome}”`;
        liAdd.className  = 'px-2 py-1 text-green-600 hover:bg-green-100 cursor-pointer text-xs';
        liAdd.addEventListener('click', async () => {
          if (!confirm(`Deseja mesmo adicionar o artigo “${nome}”?`)) return;
          // encontra 1ª linha em branco
          let blankIdx = dados.findIndex((r,i) => i >= 2 && !r[1]);
          if (blankIdx === -1) {
            blankIdx = dados.length;
            rows.push(blankIdx+1);
            dados.push(Array(dados[0].length).fill(''));
          }
          const sheetRow = blankIdx + 1;
          atualizarEstado('A adicionar artigo...');
          await atualizarCelula(sheetRow, 2, nome);
          // atualiza local
          dados[blankIdx][1] = nome;
          // mostra só a nova linha
          criarTabela(
            [dados[0], dados[1], dados[blankIdx]],
            [rows[0], rows[1], rows[blankIdx]]
          );
          updateStickyOffset();
          atualizarEstado('Pronto');
          inp.value     = '';
          sug.innerHTML = '';
        });
        sug.appendChild(liAdd);
      }
    }
  });
  



  document.addEventListener('click', e => {
    if (!inp.contains(e.target) && !sug.contains(e.target)) {
      sug.innerHTML = '';
    }
  });

  // Inicia já filtrado
  filtrarFaltas();
});
