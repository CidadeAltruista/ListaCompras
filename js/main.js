import {
  criarTabela,
  atualizarEstado,
  toggleModoEdicao
} from './ui.js';
import { adicionarArtigo, obterDados } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  let dados = [], rows = [];
  let filtroBase = 'faltas';
  const filtrosPropriedade = new Set();
  const GRUPOS_PROPRIEDADE = [
    { id: 'vistosas', label: 'Vistosas', props: ['Vistosa', '181-A', '181-B', '230-A', '230-B'] },
    { id: 'jardim', label: 'Jardim', props: ['Jardim'] },
    { id: 'francos', label: 'Francos', props: ['Francos'] },
    { id: '424', label: '424', props: ['424'] },
    { id: 'sta-catarina', label: 'Sta Catarina', props: ['Sta Catarina'] }
  ];

  function normalizeText(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  }

  function setActiveFilter(id) {
    ['mostrarFaltas', 'mostrarComprados', 'mostrarTudo'].forEach(buttonId => {
      document.getElementById(buttonId)?.classList.toggle('is-active', buttonId === id);
    });
  }

  function obterAlojamentos() {
    const cabecalho = dados[0] || [];
    const alojamentos = [];
    for (let j = 2; j < cabecalho.length; j += 2) {
      if (cabecalho[j]) alojamentos.push({ nome: cabecalho[j], estadoCol: j, qtdeCol: j + 1 });
    }
    return alojamentos;
  }

  function estadoNaoVerde(row, alojamento) {
    const estado = row[alojamento.estadoCol];
    return estado && estado !== 'R';
  }

  function passaFiltroBase(row) {
    if (filtroBase === 'tudo') return true;

    for (let j = 2; j < row.length; j += 2) {
      if (filtroBase === 'faltas' && (row[j] === 'F' || row[j] === 'C')) return true;
      if (filtroBase === 'comprados' && row[j] === 'C') return true;
    }

    return false;
  }

  function passaFiltrosPropriedade(row) {
    if (filtrosPropriedade.size === 0) return true;

    const alojamentos = obterAlojamentos();
    for (const filtroId of filtrosPropriedade) {
      const grupo = GRUPOS_PROPRIEDADE.find(item => item.id === filtroId);
      if (!grupo) continue;

      for (const alojamento of alojamentos) {
        if (grupo.props.includes(alojamento.nome) && estadoNaoVerde(row, alojamento)) {
          return true;
        }
      }
    }

    return false;
  }

  function aplicarFiltros() {
    const filteredData = [dados[0], dados[1]];
    const filteredRows = [rows[0], rows[1]];

    for (let i = 2; i < dados.length; i++) {
      if (passaFiltroBase(dados[i]) && passaFiltrosPropriedade(dados[i])) {
        filteredData.push(dados[i]);
        filteredRows.push(rows[i]);
      }
    }

    criarTabela(filteredData, filteredRows);
  }

  function renderFiltrosPropriedade() {
    const el = document.getElementById('propertyFilters');
    if (!el) return;

    el.innerHTML = '';
    for (const grupo of GRUPOS_PROPRIEDADE) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'property-filter';
      button.textContent = grupo.label;
      button.dataset.filterId = grupo.id;
      button.classList.toggle('is-active', filtrosPropriedade.has(grupo.id));
      el.appendChild(button);
    }
  }


  async function carregarDados() {
    atualizarEstado('A carregar dados...');
    try {
      const json = await obterDados();

      dados = JSON.parse(JSON.stringify(json.dados));
      rows  = JSON.parse(JSON.stringify(json.rows));

      renderFiltrosPropriedade();
      aplicarFiltros();
      atualizarEstado('Pronto');          // <- sucesso (não chamamos updateStickyOffset aqui)
    } catch (e) {
      console.error('Erro no carregarDados():', e);
      atualizarEstado('Erro ao carregar dados.');
    }
    // categorias (fora do try/catch para não mascarar erros de fetch)
    window.TODAS_CATEGORIAS = [...new Set(dados.slice(2).map(row => row[0]).filter(Boolean))];
  }

  async function filtrarFaltas() {
    filtroBase = 'faltas';
    setActiveFilter('mostrarFaltas');
    atualizarEstado('A aplicar filtro...');
    await carregarDados();
    atualizarEstado('Pronto');
  }

  async function mostrarTudo() {
    filtroBase = 'tudo';
    setActiveFilter('mostrarTudo');
    atualizarEstado('A mostrar todos...');
    await carregarDados();
  }

  async function filtrarComprados() {
    filtroBase = 'comprados';
    setActiveFilter('mostrarComprados');
    atualizarEstado('A filtrar artigos COMPRADOS…');
    await carregarDados();
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
          const novoArtigo = await adicionarArtigo(nome);
          await carregarDados();
          const novoIndex = rows.indexOf(novoArtigo.id);
          if (novoIndex !== -1) {
            window.AUTO_EDIT_ROW_ID = novoArtigo.id;
            criarTabela(
              [dados[0], dados[1], dados[novoIndex]],
              [rows[0], rows[1], rows[novoIndex]]
            );
          }
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

  document.getElementById('propertyFilters')?.addEventListener('click', e => {
    const button = e.target.closest('.property-filter');
    if (!button) return;

    const id = button.dataset.filterId;
    if (filtrosPropriedade.has(id)) filtrosPropriedade.delete(id);
    else filtrosPropriedade.add(id);

    renderFiltrosPropriedade();
    aplicarFiltros();
  });

  // Inicia já filtrado
  filtrarFaltas();
});
