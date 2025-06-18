import { atualizarCelula } from './api.js';

let modoEdicaoAtivo = false;
let dadosAtuais      = [];
let rowIndicesAtuais = [];

export function atualizarEstado(texto) {
  document.getElementById('estado').textContent = texto;
}

export function toggleModoEdicao() {
  modoEdicaoAtivo = !modoEdicaoAtivo;
  aplicarModoEdicao();
}

export function aplicarModoEdicao() {
  const botao = document.getElementById('modoEdicao');
  botao.textContent = modoEdicaoAtivo ? 'Concluir' : 'Edição';

  document.querySelectorAll('input, td[data-tipo="estado"]').forEach(el => {
    el.disabled = !modoEdicaoAtivo;
    el.classList.toggle('opacity-50', !modoEdicaoAtivo);
    el.classList.toggle('hover:bg-yellow-100', modoEdicaoAtivo);
  });
}

export function criarTabela(dados, rowIndices) {
  dadosAtuais      = JSON.parse(JSON.stringify(dados));
  rowIndicesAtuais = JSON.parse(JSON.stringify(rowIndices));

  const wrapper = document.getElementById('tabela');
  wrapper.innerHTML = '';

  const cab = dadosAtuais[0], sub = dadosAtuais[1];
  const props = [];
  for (let i = 2; i < cab.length; i += 2) {
    props.push({ nome: cab[i], estadoCol: i, qtdeCol: i + 1 });
  }

  // Mapeamentos de cores e ícones
  const icons = { 'F': '❌', 'C': '✔️', 'R': '✔️' };
  const iconColors = {
    'F': 'text-red-600',
    'C': 'text-yellow-600',
    'R': 'text-green-600'
  };
  const bgEstado = {
    'F': 'bg-red-200',
    'C': 'bg-yellow-200',
    'R': 'bg-green-200'
  };
  const bgQtde = {
    'F': 'bg-red-100',
    'C': 'bg-yellow-100',
    'R': 'bg-green-100'
  };

  // Construção da tabela
  const table = document.createElement('table');
  table.className = 'min-w-full bg-white shadow rounded text-sm';

  // Cabeçalho
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  // Total em Falta
  ;['Total em Falta','Artigo', ...props.map(p=>p.nome)].forEach((txt, idx) => {
    const th = document.createElement('th');
    th.textContent = txt;
    th.colSpan = idx < 2 ? 1 : 2;
    th.className = 'px-2 py-1 bg-gray-200 text-center';
    if (idx === 1) th.classList.replace('text-center','text-left');
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  // Corpo
  const tbody = document.createElement('tbody');
  dadosAtuais.forEach((row, idx) => {
    if (idx < 2 || !row[1]) return;  // pula cabeçalhos e linhas sem Artigo
    const sheetRow = rowIndicesAtuais[idx];
    const tr = document.createElement('tr');

    // Célula Total em Falta
    const tdSum = document.createElement('td');
    tdSum.className = 'border px-2 py-1 text-center font-semibold';
    tr.appendChild(tdSum);

    // Célula Artigo
    const tdArt = document.createElement('td');
    tdArt.textContent = row[1];
    tdArt.className = 'border px-3 py-1';
    tr.appendChild(tdArt);

    // Função para atualizar soma e cor Artigo/Total
    function updateSumAndArt() {
      let sum = 0;
      const estadosLinha = props.map(p => row[p.estadoCol]);
      props.forEach(p => {
        if (row[p.estadoCol] === 'F') {
          const v = parseInt(row[p.qtdeCol],10);
          if (!isNaN(v)) sum += v;
        }
      });
      tdSum.textContent = sum > 0 ? sum : '';
      // limpa classes
      tdSum.classList.remove('bg-red-100','bg-yellow-100','bg-green-100','text-red-800');
      tdArt.classList.remove('bg-red-100','bg-yellow-100');
      // se houver F
      if (estadosLinha.includes('F')) {
        tdSum.classList.add('bg-red-100','text-red-800');
        tdArt.classList.add('bg-red-100','text-red-800');
      }
      // senão, se houver C
      else if (estadosLinha.includes('C')) {
        tdSum.classList.add('bg-yellow-100');
        tdArt.classList.add('bg-yellow-100');
      }
    }

    // Para cada par Estado/Qtde
    props.forEach(({ estadoCol, qtdeCol }) => {
      // tdEstado
      const tdE = document.createElement('td');
      tdE.dataset.tipo = 'estado';
      tdE.disabled = true;
      tdE.className = 'border px-2 py-1 text-center opacity-50 cursor-pointer';

      // tdQtde
      const tdQ = document.createElement('td');
      tdQ.className = 'border px-2 py-1';
      const inp = document.createElement('input');
      inp.type = 'number'; inp.min = 0; inp.max = 1000;
      inp.value = row[qtdeCol] || '';
      inp.disabled = true;
      inp.className = 'w-full text-xs text-center border rounded px-1 py-1 opacity-50';
      tdQ.appendChild(inp);

      // Estado inicial
      const val = row[estadoCol] || '';
      tdE.innerHTML = val ? `<span class="${iconColors[val]}">${icons[val]}</span>` : '';
      if (val) {
        tdE.classList.add(bgEstado[val]);
        tdQ.classList.add(bgQtde[val]);
      }

      // clique no estado
      tdE.addEventListener('click', async () => {
        if (!modoEdicaoAtivo) return;
        const cycle = {'':'F','F':'C','C':'R','R':'F'};
        const novo = cycle[val] || 'F';
        row[estadoCol] = novo;

        // icon + cor do ícone
        tdE.innerHTML = `<span class="${iconColors[novo]}">${icons[novo]}</span>`;

        // atualiza fundos
        tdE.classList.remove(...Object.values(bgEstado));
        tdQ.classList.remove(...Object.values(bgQtde));
        tdE.classList.add(bgEstado[novo]);
        tdQ.classList.add(bgQtde[novo]);

        updateSumAndArt();
        atualizarEstado('A enviar alteração...');
        await atualizarCelula(sheetRow, estadoCol + 1, novo);
        atualizarEstado('Pronto');
      });

      // input Qtde com debounce
      let db;
      inp.addEventListener('input', () => {
        if (!modoEdicaoAtivo) return;
        clearTimeout(db);
        db = setTimeout(async () => {
          const v = inp.value;
          row[qtdeCol] = v;
          updateSumAndArt();
          atualizarEstado('A enviar quantidade...');
          await atualizarCelula(sheetRow, qtdeCol + 1, v);
          atualizarEstado('Pronto');
        }, 300);
      });

      tr.appendChild(tdE);
      tr.appendChild(tdQ);
    });

    updateSumAndArt();
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);

  if (modoEdicaoAtivo) aplicarModoEdicao();
}
