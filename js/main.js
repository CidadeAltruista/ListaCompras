import {
  criarTabela,
  atualizarEstado,
  toggleModoEdicao
} from './ui.js';
import { adicionarArtigo, obterDados } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  let dados = [], rows = [];

  function normalizeText(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  }

  async function carregarDados() {
    atualizarEstado('A carregar dados...');
    try {
      const json = await obterDados();

      dados = JSON.parse(JSON.stringify(json.dados));
      rows  = JSON.parse(JSON.stringify(json.rows));

      criarTabela(dados, rows);           // desenha
      atualizarEstado('Pronto');          // <- sucesso (não chamamos updateStickyOffset aqui)
    } catch (e) {
      console.error('Erro no carregarDados():', e);
      atualizarEstado('Erro ao carregar dados.');
    }
    // categorias (fora do try/catch para não mascarar erros de fetch)
    window.TODAS_CATEGORIAS = [...new Set(dados.slice(2).map(row => row[0]).filter(Boolean))];
  }

  async function filtrarFaltas() {
    atualizarEstado('A aplicar filtro...');
    await carregarDados();                // refresca dados base

    const c = [dados[0], dados[1]];
    const r = [rows[0], rows[1]];

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
    atualizarEstado('Pronto');
  }

  async function mostrarTudo() {
    atualizarEstado('A mostrar todos...');
    await carregarDados();                // já redesenha no fim
  }

  async function filtrarComprados() {
    atualizarEstado('A filtrar artigos COMPRADOS…');
    await carregarDados();

    const filteredData = [dados[0], dados[1]];
    const filteredRows = [rows[0], rows[1]];

    for (let i = 2; i < dados.length; i++) {
      let comprado = false;
      for (let j = 2; j < dados[i].length; j += 2) {
        if (dados[i][j] === 'C') { comprado = true; break; }
      }
      if (comprado) {
        filteredData.push(dados[i]);
        filteredRows.push(rows[i]);
      }
    }
    criarTabela(filteredData, filteredRows);
    atualizarEstado('Pronto');
  }

  // Botões
  document.getElementById('mostrarFaltas').addEventListener('click', filtrarFaltas);
  document.getElementById('mostrarTudo').addEventListener('click', mostrarTudo);
  document.getElementById('mostrarComprados').addEventListener('click', filtrarComprados);

  document.getElementById('modoEdicao').addEventListener('click', () => {
    // Alterna estado e deixa o ui.js gerir a classe no <body> (editing-on)
    toggleModoEdicao();
  });

  // Pesquisa + sugestões
  const inp = document.getElementById('searchInput');
  const sug = document.getElementById('suggestions');

  inp.addEventListener('input', () => {
    const term = normalizeText(inp.value.trim());
    sug.innerHTML = '';
    if (!term) return;

    // hits
    const hits = [];
    for (let i = 2; i < dados.length; i++) {
      const art = dados[i][1];
      if (!art) continue;
      const norm = normalizeText(art);
      const idx  = norm.indexOf(term);
      if (idx !== -1) hits.push({ idx, i, art });
    }
    hits.sort((a,b) => a.idx - b.idx).slice(0,5).forEach(h => {
      const li = document.createElement('li');
      li.textContent = h.art;
      li.className = 'px-2 py-1 hover:bg-gray-200 cursor-pointer text-xs';
      li.addEventListener('click', () => {
        criarTabela([dados[0], dados[1], dados[h.i]], [rows[0], rows[1], rows[h.i]]);
        sug.innerHTML = '';
        inp.value     = '';
      });
      sug.appendChild(li);
    });

    // “➕ Adicionar” só quando estiver em EDIÇÃO (classe editing-on)
    if (document.body.classList.contains('editing-on')) {
      const nome = inp.value.trim();
      if (nome) {
        const liAdd = document.createElement('li');
        liAdd.textContent = `➕ Adicionar “${nome}”`;
        liAdd.className  = 'px-2 py-1 text-green-600 hover:bg-green-100 cursor-pointer text-xs';
        liAdd.addEventListener('click', async () => {
          if (!confirm(`Deseja mesmo adicionar o artigo “${nome}”?`)) return;

          atualizarEstado('A adicionar artigo...');
          await adicionarArtigo(nome);
          await carregarDados();
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
