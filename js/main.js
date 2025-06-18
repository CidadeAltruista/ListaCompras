import { criarTabela, atualizarEstado, toggleModoEdicao } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('main.js carregado');

  const sheetURL = 'https://script.google.com/macros/s/AKfycbyVUwW8_VNHxgutACoBX5cWAqJwxyIPZX1dwrGsSYD1FsLG1pdw_MGt9tjY4WxZEZMs/exec';

  let dadosComAlteracoes = [];
  let rowIndicesAtuais   = [];

  function normalizeText(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  async function carregarDados() {
    atualizarEstado('A carregar dados...');
    try {
      const res  = await fetch(sheetURL);
      const json = await res.json();
      dadosComAlteracoes = JSON.parse(JSON.stringify(json.dados));
      rowIndicesAtuais   = dadosComAlteracoes.map((_,i)=> i+1 );
      criarTabela(dadosComAlteracoes, rowIndicesAtuais);
      atualizarEstado('Pronto');
    } catch (e) {
      console.error(e);
      atualizarEstado('Erro ao carregar dados.');
    }
  }

  async function filtrarFaltas() {
    atualizarEstado('A aplicar filtro de faltas...');
    await carregarDados();
    const cells = [dadosComAlteracoes[0], dadosComAlteracoes[1]];
    const rows  = [rowIndicesAtuais[0],   rowIndicesAtuais[1]];
    for (let i=2; i<dadosComAlteracoes.length; i++){
      if (dadosComAlteracoes[i].some((c,j)=> j>=2 && j%2===0 && c==='F')) {
        cells.push(dadosComAlteracoes[i]);
        rows.push(rowIndicesAtuais[i]);
      }
    }
    criarTabela(cells, rows);
    atualizarEstado('Pronto');
  }

  async function mostrarTudo() {
    atualizarEstado('A mostrar todos os dados...');
    await carregarDados();
  }

  // Botões
  document.getElementById('mostrarFaltas').addEventListener('click', filtrarFaltas);
  document.getElementById('mostrarTudo').addEventListener('click', mostrarTudo);
  document.getElementById('modoEdicao').addEventListener('click', toggleModoEdicao);

  // Pesquisa e sugestões
  const searchInput   = document.getElementById('searchInput');
  const suggestionsEl = document.getElementById('suggestions');

  searchInput.addEventListener('input', () => {
    const term = normalizeText(searchInput.value.trim());
    suggestionsEl.innerHTML = '';
    if (!term) return;

    // correspondências
    const hits = [];
    for (let i=2; i<dadosComAlteracoes.length; i++){
      const art = dadosComAlteracoes[i][1];
      if (!art) continue;
      const norm = normalizeText(String(art));
      const idx  = norm.indexOf(term);
      if (idx !== -1) hits.push({idx, art, row:i+1, cells:dadosComAlteracoes[i]});
    }

    hits.sort((a,b)=>a.idx-b.idx).slice(0,5).forEach(hit=>{
      const li = document.createElement('li');
      li.textContent = hit.art;
      li.className = 'px-2 py-1 hover:bg-gray-200 cursor-pointer';
      li.addEventListener('click', ()=>{
        criarTabela(
          [dadosComAlteracoes[0], dadosComAlteracoes[1], hit.cells],
          [rowIndicesAtuais[0], rowIndicesAtuais[1], hit.row]
        );
        suggestionsEl.innerHTML = '';
        searchInput.value = '';
      });
      suggestionsEl.appendChild(li);
    });

    // “Adicionar artigo”
    const liAdd = document.createElement('li');
    liAdd.textContent = `➕ Adicionar “${searchInput.value.trim()}”`;
    liAdd.className = 'px-2 py-1 text-green-600 hover:bg-green-100 cursor-pointer';
    liAdd.addEventListener('click', async ()=>{
      // ... mantém tua lógica de adicionar ...
    });
    suggestionsEl.appendChild(liAdd);
  });

  // **Esconder sugestões ao clicar fora**
  document.addEventListener('click', e => {
    if (!searchInput.contains(e.target) && !suggestionsEl.contains(e.target)) {
      suggestionsEl.innerHTML = '';
    }
  });

  carregarDados();
});
