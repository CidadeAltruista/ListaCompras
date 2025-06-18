import { atualizarCelula } from './api.js';

let modoEdicaoAtivo = false;

export function atualizarEstado(texto) {
  document.getElementById('estado').textContent = texto;
}

export function toggleModoEdicao() {
  modoEdicaoAtivo = !modoEdicaoAtivo;

  const botao = document.getElementById('modoEdicao');
  botao.textContent = modoEdicaoAtivo ? 'Concluir' : 'Edição';

  document.querySelectorAll('input, td[data-tipo="estado"]').forEach(el => {
    el.disabled = !modoEdicaoAtivo;
    el.classList.toggle('opacity-50', !modoEdicaoAtivo);
    el.classList.toggle('hover:bg-yellow-100', modoEdicaoAtivo);
  });
}

export function criarTabela(dados) {
  const wrapper = document.getElementById('tabela');
  wrapper.innerHTML = '';

  const cabecalho = dados[0];
  const subCabecalho = dados[1];

  const propriedades = [];
  for (let i = 2; i < cabecalho.length; i += 2) {
    propriedades.push({ nome: cabecalho[i], estadoCol: i, qtdeCol: i + 1 });
  }

  const tabela = document.createElement('table');
  tabela.className = 'min-w-full bg-white shadow rounded text-sm';

  const thead = document.createElement('thead');
  const tr = document.createElement('tr');

  const thSoma = document.createElement('th');
  thSoma.textContent = 'Total F';
  thSoma.className = 'px-3 py-2 bg-gray-200 text-center';
  tr.appendChild(thSoma);

  const thArt = document.createElement('th');
  thArt.textContent = 'Artigo';
  thArt.className = 'px-3 py-2 bg-gray-200 text-left';
  tr.appendChild(thArt);

  propriedades.forEach(p => {
    const th = document.createElement('th');
    th.colSpan = 2;
    th.textContent = p.nome;
    th.className = 'px-3 py-2 bg-gray-200 text-center';
    tr.appendChild(th);
  });
  thead.appendChild(tr);
  tabela.appendChild(thead);

  const tbody = document.createElement('tbody');

  for (let i = 2; i < dados.length; i++) {
    const linha = dados[i];
    if (!linha[1]) continue;

    const tr = document.createElement('tr');

    const tdFaltaTotal = document.createElement('td');
    let somaFalta = 0;

    propriedades.forEach(p => {
      if (linha[p.estadoCol] === 'F') {
        const val = parseInt(linha[p.qtdeCol], 10);
        if (!isNaN(val)) somaFalta += val;
      }
    });

    tdFaltaTotal.textContent = somaFalta > 0 ? somaFalta : '';
    tdFaltaTotal.className = 'border px-2 py-1 text-center font-semibold';
    tr.appendChild(tdFaltaTotal);

    const tdArt = document.createElement('td');
    tdArt.textContent = linha[1];
    tdArt.className = 'border px-3 py-2';
    const estadosLinha = propriedades.map(p => linha[p.estadoCol]);
    if (estadosLinha.includes('F')) tdArt.classList.add('bg-red-100');
    else if (estadosLinha.includes('C')) tdArt.classList.add('bg-yellow-100');
    tr.appendChild(tdArt);

    propriedades.forEach(({ estadoCol, qtdeCol }) => {
      const tdEstado = document.createElement('td');
      tdEstado.textContent = linha[estadoCol] || '';
      tdEstado.className = 'border px-2 py-1 text-center cursor-pointer opacity-50';
      tdEstado.dataset.tipo = 'estado';
      tdEstado.disabled = true;

      const tdQtde = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'number';
      input.min = 0;
      input.max = 1000;
      input.value = linha[qtdeCol] || '';
      input.className = 'w-full border px-2 py-1 rounded text-center opacity-50';
      input.disabled = true;

      const estadoAtual = linha[estadoCol];
      if (estadoAtual === 'F') {
        tdEstado.classList.add('bg-red-200');
        tdQtde.classList.add('bg-red-100');
      } else if (estadoAtual === 'C') {
        tdEstado.classList.add('bg-yellow-200');
        tdQtde.classList.add('bg-yellow-100');
      }

      tdEstado.addEventListener('click', async () => {
        if (!modoEdicaoAtivo) return;
        const ciclo = { '': 'F', 'F': 'C', 'C': 'R', 'R': 'F' };
        const novo = ciclo[tdEstado.textContent] || 'F';
        tdEstado.textContent = novo;

        tdEstado.classList.remove('bg-red-200', 'bg-yellow-200');
        tdQtde.classList.remove('bg-red-100', 'bg-yellow-100');
        if (novo === 'F') {
          tdEstado.classList.add('bg-red-200');
          tdQtde.classList.add('bg-red-100');
        } else if (novo === 'C') {
          tdEstado.classList.add('bg-yellow-200');
          tdQtde.classList.add('bg-yellow-100');
        }

        const linhaSheet = i + 1;
        const colSheet = estadoCol + 1;
        atualizarEstado('A enviar alteração...');
        await atualizarCelula(linhaSheet, colSheet, novo);
        atualizarEstado('Pronto');
      });

      input.addEventListener('change', async () => {
        if (!modoEdicaoAtivo) return;
        const linhaSheet = i + 1;
        const colSheet = qtdeCol + 1;
        atualizarEstado('A enviar quantidade...');
        await atualizarCelula(linhaSheet, colSheet, input.value);
        atualizarEstado('Pronto');
      });

      tdQtde.appendChild(input);

      tr.appendChild(tdEstado);
      tdQtde.className = 'border px-2 py-1';
      tr.appendChild(tdQtde);
    });

    tbody.appendChild(tr);
  }

  tabela.appendChild(tbody);
  wrapper.appendChild(tabela);
}
