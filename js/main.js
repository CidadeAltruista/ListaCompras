document.addEventListener('DOMContentLoaded', () => {
  console.log('main.js carregado');

  import('./ui.js').then(({ criarTabela, atualizarEstado, toggleModoEdicao }) => {
    const API_URL = 'https://script.google.com/macros/s/AKfycbyVUwW8_VNHxgutACoBX5cWAqJwxyIPZX1dwrGsSYD1FsLG1pdw_MGt9tjY4WxZEZMs/exec';
    let dadosCache = [];

    // Injetar campo de pesquisa e sugestões
    const estadoDiv = document.getElementById('estado');
    estadoDiv.insertAdjacentHTML('afterend', `
      <div class="mb-4">
        <input id="search" type="text" placeholder="Pesquisar artigo..." class="w-full md:w-1/2 border px-2 py-1 rounded" />
        <ul id="suggestions" class="bg-white border shadow rounded mt-1 max-h-40 overflow-y-auto"></ul>
      </div>
    `);
    const searchInput = document.getElementById('search');
    const suggestionsList = document.getElementById('suggestions');

    // Função para buscar dados do Sheets e armazenar em cache
    async function buscarDados() {
      atualizarEstado('A carregar dados do Sheets...');
      const res = await fetch(API_URL);
      const json = await res.json();
      dadosCache = JSON.parse(JSON.stringify(json.dados));
      return dadosCache;
    }

    async function carregarDados() {
      try {
        const dados = await buscarDados();
        criarTabela(dados);
        atualizarEstado('Pronto');
      } catch (err) {
        console.error(err);
        atualizarEstado('Erro ao carregar dados.');
      }
    }

    async function filtrarFaltas() {
      try {
        await buscarDados();
        atualizarEstado('A aplicar filtro de faltas...');
        const filtrados = [dadosCache[0], dadosCache[1]];
        for (let i = 2; i < dadosCache.length; i++) {
          const linha = dadosCache[i];
          for (let j = 2; j < linha.length; j += 2) {
            if (linha[j] === 'F') { filtrados.push(linha); break; }
          }
        }
        criarTabela(filtrados);
        atualizarEstado('Pronto');
      } catch (err) {
        console.error(err);
        atualizarEstado('Erro ao filtrar dados.');
      }
    }

    async function mostrarTudo() {
      await carregarDados();
    }

    // Normalização para pesquisa sem acentos e case-insensitive
    function normalize(str) {
      return str
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    }

    function onSearchInput(e) {
      const term = normalize(e.target.value);
      suggestionsList.innerHTML = '';
      if (!term) return;
      // Filtra do cache completo (sem recarga)
      const results = dadosCache.slice(2).filter(row => normalize(row[1]).includes(term));
      // Ordena pela posição da correspondência
      results.sort((a, b) => normalize(a[1]).indexOf(term) - normalize(b[1]).indexOf(term));
      results.slice(0, 5).forEach(linha => {
        const li = document.createElement('li');
        li.textContent = linha[1];
        li.className = 'px-2 py-1 cursor-pointer hover:bg-gray-200';
        li.addEventListener('click', () => {
          criarTabela([dadosCache[0], dadosCache[1], linha]);
          suggestionsList.innerHTML = '';
        });
        suggestionsList.appendChild(li);
      });
    }

    // Ligar eventos
    document.getElementById('mostrarFaltas').addEventListener('click', filtrarFaltas);
    document.getElementById('mostrarTudo').addEventListener('click', mostrarTudo);
    document.getElementById('modoEdicao').addEventListener('click', toggleModoEdicao);
    searchInput.addEventListener('input', onSearchInput);

    // Carregamento inicial
    carregarDados();
  });
});
