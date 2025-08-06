import { atualizarCelula } from './api.js';

let modoEdicaoAtivo   = false;
let dadosAtuais       = [];
let rowIndicesAtuais  = [];

/** Mostra mensagem de estado */
export function atualizarEstado(texto) {
  document.getElementById('estado').textContent = texto;
}

/** Alterna entre Edição / Concluir */
export function toggleModoEdicao() {
  modoEdicaoAtivo = !modoEdicaoAtivo;
  aplicarModoEdicao();
}

/** Habilita/desabilita controles e lápis */
export function aplicarModoEdicao() {
  const botao = document.getElementById('modoEdicao');
  botao.textContent = modoEdicaoAtivo ? 'Concluir' : 'Edição';

  // Inputs, estados, deletes
  document.querySelectorAll('#tabela input, td[data-tipo="estado"], td[data-tipo="delete"]')
    .forEach(el => {
      el.disabled = !modoEdicaoAtivo;
      el.classList.toggle('opacity-50', !modoEdicaoAtivo);
      el.classList.toggle('hover:bg-yellow-100', modoEdicaoAtivo);
    });

  // Mostrar/ocultar ícones lápis
  document.querySelectorAll('td[data-tipo="artigo"] .pencil-icon')
    .forEach(el => el.style.opacity = modoEdicaoAtivo ? '1' : '0');
}

/**
 * Monta a tabela completa
 * @param {Array[]} dados      Matriz com todas as linhas
 * @param {number[]} rowIndices Índices de linha no Sheets
 */
export function criarTabela(dados, rowIndices) {
  dadosAtuais      = JSON.parse(JSON.stringify(dados));
  rowIndicesAtuais = JSON.parse(JSON.stringify(rowIndices));

  const categoriasUnicas = window.TODAS_CATEGORIAS || [];

  const wrapper = document.getElementById('tabela');
  wrapper.innerHTML = '';

  const cab  = dadosAtuais[0],
        sub  = dadosAtuais[1];
  let props = [];
  for (let i = 2; i < cab.length; i += 2) {
    props.push({ nome: cab[i], estadoCol: i, qtdeCol: i + 1 });
  }
  if (Array.isArray(window.PROPS_TO_SHOW)) {
    props = props.filter(p => window.PROPS_TO_SHOW.includes(p.nome));
  }

  // Mapeamentos de ícones e cores
  const icons      = { F:'❗', C:'✔', R:'✅' };
  const iconColors = { F:'text-red-600', C:'text-yellow-600', R:'text-green-600' };
  const bgEstado   = { F:'bg-red-200',  C:'bg-yellow-200', R:'bg-green-200' };
  const bgQtde     = { F:'bg-red-100',  C:'bg-yellow-100', R:'bg-green-100' };

  // Criar tabela
  const table = document.createElement('table');
  table.className = 'min-w-full bg-white shadow rounded text-sm table-fixed';

  // Cabeçalho
  const thead = document.createElement('thead');
  const hr    = document.createElement('tr');
  ['#','Artigo', ...props.map(p=>p.nome),''].forEach((txt,idx) => {
    const th = document.createElement('th');
    th.textContent = txt;
    th.colSpan    = idx<2 ? 1 : (idx<props.length+2 ? 2 : 1);
    th.className  = 'px-2 py-1 bg-gray-200 text-center text-xs';
    if(idx===1) th.classList.replace('text-center','text-left');
    // Adiciona data-tipo="estado" aos <th> das colunas de estado
    if (idx >= 2 && idx < props.length + 2 && (idx - 2) % 2 === 0) {
      th.setAttribute('data-tipo', 'estado');
    }
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  // Corpo
  const tbody = document.createElement('tbody');
  let lastCategoria = null;
  dadosAtuais.forEach((row, idx) => {
    if (idx < 2 || !row[1]) return;
    const categoria = row[0] || '';
    // Se mudou de categoria, insere linha de categoria
    if (categoria !== lastCategoria) {
      lastCategoria = categoria;
      const trCat = document.createElement('tr');
      trCat.className = 'categoria'; // <-- aqui!
      const tdCat = document.createElement('td');
      tdCat.colSpan = props.length * 2 + 2; // ou o valor correto para o teu caso
      tdCat.textContent = categoria;
      trCat.appendChild(tdCat);
      tbody.appendChild(trCat);
    }

    const sheetRow = rowIndicesAtuais[idx];
    const tr = document.createElement('tr');

    // Total em Falta
    const tdSum = document.createElement('td');
    tdSum.className = 'border px-2 py-1 text-center font-semibold text-xs';
    tr.appendChild(tdSum);

    // Artigo com lápis
    const tdArt = document.createElement('td');
    tdArt.dataset.tipo = 'artigo';
    tdArt.className    = 'border px-3 py-1 text-xs relative';

    const spanText = document.createElement('span');
    spanText.textContent = row[1];
    spanText.className   = 'pr-4';

    const pencil = document.createElement('span');
    pencil.innerHTML = '✏️';
    pencil.className = 'pencil-icon absolute top-1 right-1 text-xs cursor-pointer transition-opacity';
    pencil.style.opacity = modoEdicaoAtivo ? '1' : '0';
    pencil.title = 'Editar artigo';

    tdArt.appendChild(spanText);
    tdArt.appendChild(pencil);
    tr.appendChild(tdArt);

    // Função para recalcular soma + cores
    function updateSumAndArt() {
      let sum = 0;
      const estLines = props.map(p => row[p.estadoCol]);
      props.forEach(p => {
        if (row[p.estadoCol]==='F') {
          const v = parseInt(row[p.qtdeCol],10);
          if (!isNaN(v)) sum += v;
        }
      });
      tdSum.textContent = sum>0?sum:'';
      tdSum.classList.remove('bg-red-100','bg-yellow-100','text-red-800');
      spanText.classList.remove('bg-red-100','bg-yellow-100','text-red-800');
      if (estLines.includes('F')) {
        tdSum.classList.add('bg-red-100','text-red-800');
        spanText.classList.add('bg-red-100','text-red-800');
      } else if (estLines.includes('C')) {
        tdSum.classList.add('bg-yellow-100');
        spanText.classList.add('bg-yellow-100');
      }
    }

    // Edição inline do Artigo
    function enterEditMode() {
      if (!modoEdicaoAtivo) return;

      // Input para o nome do artigo
      const inputArtigo = document.createElement('input');
      inputArtigo.type  = 'text';
      inputArtigo.value = spanText.textContent;
      inputArtigo.className = 'w-full text-xs border rounded px-1 py-0.5 mb-1';

      // Select para categoria existente
      const selectCat = document.createElement('select');
      selectCat.className = 'w-full text-xs border rounded px-1 py-0.5 mb-1';

      // Adiciona todas as categorias únicas
      categoriasUnicas.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (cat === row[0]) opt.selected = true;
        selectCat.appendChild(opt);
      });

      // Adiciona a opção "Adicionar Nova"
      const optNova = document.createElement('option');
      optNova.value = '__nova__';
      optNova.textContent = '➕ Adicionar Nova';
      selectCat.appendChild(optNova);

      // Se a categoria atual não está na lista, adiciona-a e seleciona
      if (row[0] && !categoriasUnicas.includes(row[0])) {
        const opt = document.createElement('option');
        opt.value = row[0];
        opt.textContent = row[0];
        opt.selected = true;
        selectCat.insertBefore(opt, selectCat.firstChild);
      }

      // Quando escolhe "Adicionar Nova", pede ao utilizador a nova categoria
      selectCat.addEventListener('change', () => {
        if (selectCat.value === '__nova__') {
          const nova = prompt('Nova categoria:');
          if (nova && !categoriasUnicas.includes(nova)) {
            // Adiciona ao dropdown e seleciona
            const opt = document.createElement('option');
            opt.value = nova;
            opt.textContent = nova;
            opt.selected = true;
            selectCat.insertBefore(opt, optNova);
            selectCat.value = nova;
          } else if (nova) {
            selectCat.value = nova;
          } else {
            // Se cancelar, volta à anterior
            selectCat.selectedIndex = 0;
          }
        }
      });

      // Container para inputs
      const container = document.createElement('div');
      container.appendChild(inputArtigo);
      container.appendChild(selectCat);

      spanText.replaceWith(container);
      pencil.style.opacity = '0';
      inputArtigo.focus();

      function finishEdit() {
        const categoriaFinal = selectCat.value;
        const novoArtigo = inputArtigo.value.trim();
        container.replaceWith(spanText);
        spanText.textContent = novoArtigo;
        pencil.style.opacity = modoEdicaoAtivo ? '1' : '0';

        // Só envia se mudou
        let mudou = false;
        if (novoArtigo !== row[1]) {
          row[1] = novoArtigo;
          mudou = true;
          atualizarEstado('A enviar artigo...');
          atualizarCelula(sheetRow, 2, novoArtigo)
            .then(()=> atualizarEstado('Pronto'))
            .catch(()=> atualizarEstado('Erro ao enviar artigo'));
        }
        if (categoriaFinal !== row[0]) {
          row[0] = categoriaFinal;
          mudou = true;
          atualizarEstado('A enviar categoria...');
          atualizarCelula(sheetRow, 1, categoriaFinal)
            .then(()=> atualizarEstado('Pronto'))
            .catch(()=> atualizarEstado('Erro ao enviar categoria'));
        }
      }

      // Sai do modo de edição ao perder o foco de ambos os campos
      container.addEventListener('focusout', (e) => {
        setTimeout(() => {
          if (!container.contains(document.activeElement)) finishEdit();
        }, 0);
      });

      inputArtigo.addEventListener('keydown', e => {
        if (e.key==='Enter') {
          e.preventDefault();
          inputArtigo.blur();
        }
      });
      selectCat.addEventListener('keydown', e => {
        if (e.key==='Enter') {
          e.preventDefault();
          selectCat.blur();
        }
      });
    }

    pencil.addEventListener('click', enterEditMode);
    spanText.addEventListener('dblclick', enterEditMode);

    // Estados / Qtde
    props.forEach(({estadoCol, qtdeCol}) => {
      const tdE = document.createElement('td');
      tdE.dataset.tipo = 'estado';
      tdE.disabled     = true;
      tdE.className    = 'border px-2 py-1 text-center opacity-50 cursor-pointer';

      const tdQ = document.createElement('td');
      tdQ.className = 'border px-2 py-1';
      const inp = document.createElement('input');
      inp.type     = 'number';
      inp.min      = 0;
      inp.max      = 1000;
      inp.value    = row[qtdeCol]||'';
      inp.disabled = true;
      inp.className= 'w-full text-xs text-center border rounded px-1 py-1 opacity-50';
      inp.addEventListener('focus', ()=> inp.select());
      tdQ.appendChild(inp);

      const init = row[estadoCol]||'';
      if (init) {
        tdE.innerHTML = `<span class="${iconColors[init]}">${icons[init]}</span>`;
        tdE.classList.add(bgEstado[init]);
        tdQ.classList.add(bgQtde[init]);
      }
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

      let db;
      inp.addEventListener('input', ()=>{
        if (!modoEdicaoAtivo) return;
        clearTimeout(db);
        db = setTimeout(async()=>{
          row[qtdeCol] = inp.value;
          updateSumAndArt();
          atualizarEstado('A enviar quantidade...');
          await atualizarCelula(sheetRow, qtdeCol+1, inp.value);
          atualizarEstado('Pronto');
        },300);
      });

      tr.appendChild(tdE);
      tr.appendChild(tdQ);
    });

    // Delete
    const tdDel = document.createElement('td');
    tdDel.dataset.tipo = 'delete';
    tdDel.textContent  = '❌';
    tdDel.disabled     = true;
    tdDel.className    = 'border px-2 py-1 text-center opacity-50 cursor-pointer text-xs';
    tdDel.addEventListener('click', async()=>{
      if (!modoEdicaoAtivo) return;
      if (!confirm(`Eliminar “${row[1]}”?`)) return;
      atualizarEstado('Eliminando...');
      await atualizarCelula(sheetRow,2,'');
      tr.remove();
      atualizarEstado('Pronto');
    });
    tr.appendChild(tdDel);

    updateSumAndArt();
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);
  updateStickyOffset();
  
      // Ajusta a variável CSS com a largura real da 1ª célula
    function updateStickyOffset() {
      const tbl = document.querySelector('#tabela table');
      if (!tbl) return;
      // Seleciona a 1ª célula (td ou th) da primeira linha
      const firstCell = tbl.querySelector('tr > *');
      const w = firstCell.getBoundingClientRect().width + 'px';
      tbl.style.setProperty('--first-col-width', w);
    }

    // Dispara logo após renderizar a tabela
    updateStickyOffset();
    // E também em resize, para quando mudares o tamanho da janela
    window.addEventListener('resize', updateStickyOffset);

  

  if (modoEdicaoAtivo) aplicarModoEdicao();
}


