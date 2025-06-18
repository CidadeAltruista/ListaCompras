import { atualizarEstado } from './api.js';

export function criarTabela(dados) {
  const tabela = document.createElement('table');
  tabela.className = 'min-w-full bg-white shadow rounded';

  // Cabeçalhos
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  dados[0].forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    th.className = 'px-3 py-2 bg-gray-200';
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  tabela.appendChild(thead);

  // Corpo de quem?
  const tbody = document.createElement('tbody');
  for (let i = 1; i < dados.length; i++) {
    const row = document.createElement('tr');
    dados[i].forEach((valor, j) => {
      const td = document.createElement('td');
      td.className = 'border px-3 py-2 text-center';

      if (j >= 2) {
        td.textContent = valor;
        td.classList.add('cursor-pointer', 'hover:bg-yellow-100');
        td.addEventListener('click', async () => {
          const next = { '': 'F', 'F': 'C', 'C': 'R', 'R': 'F' }[valor] || 'F';
          td.textContent = next;
          await atualizarEstado(i + 1, j + 1, next); // +1 por causa do cabeçalho
        });
      } else {
        td.textContent = valor;
      }

      row.appendChild(td);
    });
    tbody.appendChild(row);
  }
  tabela.appendChild(tbody);

  const wrapper = document.getElementById('tabela');
  wrapper.innerHTML = '';
  wrapper.appendChild(tabela);
}
