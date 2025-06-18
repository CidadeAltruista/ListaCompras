import { atualizarCelula } from './api.js';

let modoEdicaoAtivo = false;
let dadosAtuais = [];
let rowIndicesAtuais = [];

/**
 * Atualiza a mensagem de estado na UI
 */
export function atualizarEstado(texto) {
  document.getElementById('estado').textContent = texto;
}

/**
 * Alterna entre modo edição e modo leitura
 */
export function toggleModoEdicao() {
  modoEdicaoAtivo = !modoEdicaoAtivo;
  aplicarModoEdicao();
}

/**
 * Aplica visualmente o estado de edição (habilita inputs e cliques)
 */
export function aplicarModoEdicao() {
  const botao = document.getElementById('modoEdicao');
  botao.textContent = modoEdicaoAtivo ? 'Concluir' : 'Edição';

  document.querySelectorAll('input, td[data-tipo="estado"]').forEach(el => {
    el.disabled = !modoEdicaoAtivo;
    el.classList.toggle('opacity-50', !modoEdicaoAtivo);
    el.classList.toggle('hover:bg-yellow-100', modoEdicaoAtivo);
  });
}

/**
 * Cria e renderiza a tabela a partir dos dados e dos índices de linha no Sheets.
 * @param {Array[]} dados       – Matriz de linhas (cada linha é um array de células)
 * @param {number[]} rowIndices – Matriz de números de linha correspondentes em Google Sheets
 */
export function criarTabela(dados, rowIndices) {
  // Guarda localmente os dados e os seus índices
  dadosAtuais = JSON.parse(JSON.stringify(dados));
  rowIndicesAtuais = JSON.parse(JSON.stringify(rowIndices));

  const wrapper = document.getElementById('tabela');
  wrapper.innerHTML = '';

  const cabecalho    = dadosAtuais[0];
  const subCabecalho = dadosAtuais[1];

  // Detecta colunas de pares (Estado / Qtde)
  const propriedades = [];
  for (let i = 2; i < cabecalho.length; i += 2) {
    propriedades.push({ nome: cabecalho[i], estadoCol: i, qtdeCol: i + 1 });
  }

  // Construir <table>
  const tabela = document.createElement('table');
  tabela.className = 'min-w-full bg-white shadow rounded text-sm';

  // Cabeçalho
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');

  // Coluna “Total F”
  const thTotal = document.createElement('th');
  thTotal.textContent = 'Total F';
  thTotal.className = 'px-3 py-2 bg-gray-200 text-center';
  headRow.appendChild(thTotal);

  // Coluna “Artigo”
  const thArt = document.createElement('th');
  thArt.textContent = 'Artigo';
  thArt.className = 'px-3 py-2 bg-gray-200 text-left';
  headRow.appendChild(thArt);

  // Colunas de propriedades
  propriedades.forEach(p => {
    const th = document.createElement('th');
    th.colSpan = 2;
    th.textContent = p.nome;
    th.className = 'px-3 py-2 bg-gray-200 text-center';
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
  tabela.appendChild(thead);

  // Corpo
  const tbody = document.createElement('tbody');

  for (let idx = 2; idx < dadosAtuais.length; idx++) {
    const linha    = dadosAtuais[idx];
    const sheetRow = rowIndicesAtuais[idx];

    // Ignora linhas sem artigo
    if (!linha[1]) continue;

    const tr = document.createElement('tr');

    // Célula “Total F” (soma dinâmica)
    const tdTotalF = document.createElement('td');
    tdTotalF.className = 'border px-2 py-1 text-center font-semibold';
    tr.appendChild(tdTotalF);

    // Célula “Artigo”
    const tdArt = document.createElement('td');
    tdArt.textContent = linha[1];
    tdArt.className = 'border px-3 py-2';
    tr.appendChild(tdArt);

    // Função para recalcular soma e cor do artigo
    function atualizarSomaFalta() {
      let soma = 0;
      propriedades.forEach(p => {
        if (linha[p.estadoCol] === 'F') {
          const v = parseInt(linha[p.qtdeCol], 10);
          if (!isNaN(v)) soma += v;
        }
      });
      tdTotalF.textContent = soma > 0 ? soma : '';

      // Cor do artigo
      const estados = propriedades.map(p => linha[p.estadoCol]);
      tdArt.classList.remove('bg-red-100', 'bg-yellow-100');
      if (estados.includes('F')) tdArt.classList.add('bg-red-100');
      else if (estados.includes('C')) tdArt.classList.add('bg-yellow-100');
    }

    // Para cada par Estado/Qtde
    propriedades.forEach(({ estadoCol, qtdeCol }) => {
      // Célula Estado
      const tdEstado = document.createElement('td');
      tdEstado.dataset.tipo = 'estado';
      tdEstado.textContent  = linha[estadoCol] || '';
      tdEstado.disabled     = true;
      tdEstado.className     = 'border px-2 py-1 text-center cursor-pointer opacity-50';

      // Célula Qtde
      const tdQtde = document.createElement('td');
      tdQtde.className = 'border px-2 py-1';
      const input = document.createElement('input');
      input.type    = 'number';
      input.min     = 0;
      input.max     = 1000;
      input.value   = linha[qtdeCol] || '';
      input.disabled  = true;
      input.className = 'w-full border px-2 py-1 rounded text-center opacity-50';

      // Cores iniciais
      const estadoVal = linha[estadoCol];
      if (estadoVal === 'F') {
        tdEstado.classList.add('bg-red-200');
        tdQtde.classList.add('bg-red-100');
      } else if (estadoVal === 'C') {
        tdEstado.classList.add('bg-yellow-200');
        tdQtde.classList.add('bg-yellow-100');
      }

      // Clique no Estado → ciclo F→C→R→F
      tdEstado.addEventListener('click', async () => {
        if (!modoEdicaoAtivo) return;
        const ciclo = { '': 'F', 'F': 'C', 'C': 'R', 'R': 'F' };
        const novo  = ciclo[tdEstado.textContent] || 'F';
        tdEstado.textContent = novo;
        linha[estadoCol]     = novo;

        tdEstado.classList.remove('bg-red-200', 'bg-yellow-200');
        tdQtde.classList.remove('bg-red-100', 'bg-yellow-100');
        if (novo === 'F') {
          tdEstado.classList.add('bg-red-200');
          tdQtde.classList.add('bg-red-100');
        } else if (novo === 'C') {
          tdEstado.classList.add('bg-yellow-200');
          tdQtde.classList.add('bg-yellow-100');
        }

        atualizarSomaFalta();
        atualizarEstado('A enviar alteração...');
        await atualizarCelula(sheetRow, estadoCol + 1, novo);
        atualizarEstado('Pronto');
      });

      // Debounce na alteração de Qtde
      let debounceTimeout;
      input.addEventListener('input', () => {
        if (!modoEdicaoAtivo) return;
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(async () => {
          const novoVal = input.value;
          linha[qtdeCol] = novoVal;
          atualizarSomaFalta();
          atualizarEstado('A enviar quantidade...');
          await atualizarCelula(sheetRow, qtdeCol + 1, novoVal);
          atualizarEstado('Pronto');
        }, 300);
      });

      tdQtde.appendChild(input);

      tr.appendChild(tdEstado);
      tr.appendChild(tdQtde);
    });

    // Atualiza soma inicial e adiciona a linha à tabela
    atualizarSomaFalta();
    tbody.appendChild(tr);
  }

  tabela.appendChild(tbody);
  wrapper.appendChild(tabela);

  // Se estivermos em edição, reaplica
  if (modoEdicaoAtivo) aplicarModoEdicao();
}
