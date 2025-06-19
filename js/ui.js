import { atualizarCelula } from './api.js';

let modoEdicaoAtivo = false;
let dadosAtuais      = [];
let rowIndicesAtuais = [];

/** Atualiza mensagem de estado */
export function atualizarEstado(texto) {
  document.getElementById('estado').textContent = texto;
}

/** Alterna entre modo edição e leitura */
export function toggleModoEdicao() {
  modoEdicaoAtivo = !modoEdicaoAtivo;
  aplicarModoEdicao();
}

/** Habilita/desabilita controles em tabela */
export function aplicarModoEdicao() {
  const botao = document.getElementById('modoEdicao');
  botao.textContent = modoEdicaoAtivo ? 'Concluir' : 'Edição';

  // Afeta só inputs da tabela, estados e deletes, não o searchInput  
  document.querySelectorAll(
    '#tabela input, td[data-tipo="estado"], td[data-tipo="delete"]'
  ).forEach(el => {
    el.disabled = !modoEdicaoAtivo;
    el.classList.toggle('opacity-50', !modoEdicaoAtivo);
    el.classList.toggle('hover:bg-red-100', modoEdicaoAtivo);
  });
}

/**
 * Cria tabela com coluna de delete no final
 * @param {Array[]} dados       linhas
 * @param {number[]} rowIndices índices de folha
 */
export function criarTabela(dados, rowIndices) {
  dadosAtuais      = JSON.parse(JSON.stringify(dados));
  rowIndicesAtuais = JSON.parse(JSON.stringify(rowIndices));

  const wrapper = document.getElementById('tabela');
  wrapper.innerHTML = '';

  const [cab, sub] = dadosAtuais;
  const props = [];
  for (let i = 2; i < cab.length; i += 2) {
    props.push({ nome: cab[i], estadoCol: i, qtdeCol: i + 1 });
  }

  // Ícones & cores
  const icons      = { F: '❗', C: '✔', R: '✅' };
  const iconColors = { F: 'text-red-600', C: 'text-yellow-600', R: 'text-green-600' };
  const bgEstado   = { F: 'bg-red-200', C: 'bg-yellow-200', R: 'bg-green-200' };
  const bgQtde     = { F: 'bg-red-100', C: 'bg-yellow-100', R: 'bg-green-100' };

  // Monta table
  const table = document.createElement('table');
  table.className = 'min-w-full bg-white shadow rounded text-sm table-fixed';

  // Cabeçalho
  const thead = document.createElement('thead');
  const hr    = document.createElement('tr');
  ['Total em Falta','Artigo', ...props.map(p=>p.nome), ''].forEach((txt, idx) => {
    const th = document.createElement('th');
    th.textContent = txt;
    th.colSpan    = idx < 2 ? 1 : (idx < props.length+2 ? 2 : 1);
    th.className  = 'px-2 py-1 bg-gray-200 text-center text-xs';
    if (idx === 1) th.classList.replace('text-center','text-left');
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  // Corpo
  const tbody = document.createElement('tbody');
  dadosAtuais.forEach((row, idx) => {
    if (idx < 2 || !row[1]) return;
    const sheetRow = rowIndicesAtuais[idx];
    const tr       = document.createElement('tr');

    // Total em Falta
    const tdSum = document.createElement('td');
    tdSum.className = 'border px-2 py-1 text-center font-semibold text-xs';
    tr.appendChild(tdSum);

    // Artigo
    const tdArt = document.createElement('td');
    tdArt.textContent = row[1];
    tdArt.className   = 'border px-3 py-1 text-xs';
    tr.appendChild(tdArt);

    // Recalcula soma e cores
    function updateSumAndArt() {
      let sum = 0;
      const estadosLinha = props.map(p => row[p.estadoCol]);
      props.forEach(p => {
        if (row[p.estadoCol] === 'F') {
          const v = parseInt(row[p.qtdeCol],10);
          if (!isNaN(v)) sum += v;
        }
      });
      tdSum.textContent = sum>0?sum:'';
      tdSum.classList.remove('bg-red-100','bg-yellow-100','text-red-800');
      tdArt.classList.remove('bg-red-100','bg-yellow-100','text-red-800');
      if (estadosLinha.includes('F')) {
        tdSum.classList.add('bg-red-100','text-red-800');
        tdArt.classList.add('bg-red-100','text-red-800');
      } else if (estadosLinha.includes('C')) {
        tdSum.classList.add('bg-yellow-100');
        tdArt.classList.add('bg-yellow-100');
      }
    }

    // Estado/Qtde
    props.forEach(({ estadoCol, qtdeCol }) => {
      const tdE = document.createElement('td');
      tdE.dataset.tipo = 'estado';
      tdE.disabled     = true;
      tdE.className    = 'border px-2 py-1 text-center opacity-50 cursor-pointer';

      const tdQ = document.createElement('td');
      tdQ.className = 'border px-2 py-1';
      const inp = document.createElement('input');
      inp.type      = 'number';
      inp.min       = 0;
      inp.max       = 1000;
      inp.value     = row[qtdeCol]||'';
      inp.disabled  = true;
      inp.className = 'w-full text-xs text-center border rounded px-1 py-1 opacity-50';
      inp.addEventListener('focus',()=>inp.select());
      tdQ.appendChild(inp);

      // inicial
      const init = row[estadoCol]||'';
      if(init) {
        tdE.innerHTML = `<span class="${iconColors[init]}">${icons[init]}</span>`;
        tdE.classList.add(bgEstado[init]);
        tdQ.classList.add(bgQtde[init]);
      }

      // ciclar estados
      tdE.addEventListener('click', async()=>{
        if(!modoEdicaoAtivo) return;
        const cycle = {'':'F','F':'C','C':'R','R':'F'};
        const next = cycle[row[estadoCol]||''];
        row[estadoCol]=next;
        tdE.innerHTML = `<span class="${iconColors[next]}">${icons[next]}</span>`;
        tdE.classList.remove(...Object.values(bgEstado));
        tdQ.classList.remove(...Object.values(bgQtde));
        tdE.classList.add(bgEstado[next]);
        tdQ.classList.add(bgQtde[next]);
        updateSumAndArt();
        atualizarEstado('A enviar alteração...');
        await atualizarCelula(sheetRow, estadoCol+1, next);
        atualizarEstado('Pronto');
      });

      // debounce quantidade
      let db;
      inp.addEventListener('input',()=>{
        if(!modoEdicaoAtivo) return;
        clearTimeout(db);
        db = setTimeout(async()=>{
          row[qtdeCol]=inp.value;
          updateSumAndArt();
          atualizarEstado('A enviar quantidade...');
          await atualizarCelula(sheetRow, qtdeCol+1, inp.value);
          atualizarEstado('Pronto');
        },300);
      });

      tr.appendChild(tdE);
      tr.appendChild(tdQ);
    });

    // Botão de delete
    const tdDel = document.createElement('td');
    tdDel.dataset.tipo = 'delete';
    tdDel.textContent  = '❌';
    tdDel.disabled     = true;
    tdDel.className    = 'border px-2 py-1 text-center opacity-50 cursor-pointer text-xs';
    tdDel.addEventListener('click', async()=>{
      if(!modoEdicaoAtivo) return;
      atualizarEstado('Eliminando...');
      await atualizarCelula(sheetRow, 2, ''); // apaga Artigo
      tr.remove();
      atualizarEstado('Pronto');
    });
    tr.appendChild(tdDel);

    updateSumAndArt();
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);

  if(modoEdicaoAtivo) aplicarModoEdicao();
}
