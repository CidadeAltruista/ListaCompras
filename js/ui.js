import { apagarArtigo, atualizarCelula } from './api.js';

let modoEdicaoAtivo   = false;
let dadosAtuais       = [];
let rowIndicesAtuais  = [];
let atualizarLista = null;

export function definirAtualizacaoLista(callback) {
  atualizarLista = callback;
}

/** Mostra mensagem de estado (com animação tipo “typing”) */
let _estadoTimer; // opcional
export function atualizarEstado(msg) {
  const el = document.getElementById('estado');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('estado-ok', msg === 'Pronto');
  el.classList.toggle('estado-busy', msg !== 'Pronto');
  el.classList.remove('estado-typing');
  el.style.animation = '';
}

/** Alterna entre Edição / Concluir */
export function toggleModoEdicao() {
  modoEdicaoAtivo = !modoEdicaoAtivo;
  aplicarModoEdicao();
}

/** Habilita/desabilita controles e lápis + classe no <body> */
export function aplicarModoEdicao() {
  const botao = document.getElementById('modoEdicao');
  const label = botao?.querySelector('.button-label');
  if (label) label.textContent = modoEdicaoAtivo ? 'Concluir' : 'Edição';
  else if (botao) botao.textContent = modoEdicaoAtivo ? 'Concluir' : 'Edição';

  // Inputs, estados e coluna delete ganham/ perdem “inativos”
  document.querySelectorAll('#tabela input, td[data-tipo="estado"], td[data-tipo="delete"]')
    .forEach(el => {
      el.disabled = !modoEdicaoAtivo;
      el.classList.toggle('opacity-50', !modoEdicaoAtivo);
      el.classList.toggle('hover:bg-yellow-100', modoEdicaoAtivo);
    });

  // Ícone de lápis só visível em edição
  document.querySelectorAll('td[data-tipo="artigo"] .pencil-icon')
    .forEach(el => el.style.opacity = modoEdicaoAtivo ? '1' : '0');

  // Classe única de estado no <body> (controla esbatido e ❌ por CSS)
  document.body.classList.toggle('editing-on', modoEdicaoAtivo);
  botao?.classList.toggle('is-active', modoEdicaoAtivo);
  document.body.classList.remove('modo-edicao'); // limpa classe antiga, se existir
}

/* Helpers */
function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function classesPorEstado(estado) {
  switch (estado) {
    case 'F': return { wrap: 'bg-red-50 text-red-800 border-red-100', name: 'underline', qty: 'font-semibold' };
    case 'C': return { wrap: 'bg-amber-50 text-amber-800 border-amber-100', name: 'underline', qty: 'font-semibold' };
    case 'R': return { wrap: 'bg-emerald-50 text-emerald-800 border-emerald-100', name: 'underline', qty: 'font-semibold' };
    default : return { wrap: 'bg-gray-50 text-gray-600 border-gray-100', name: '', qty: '' };
  }
}

const ORDEM_PROPRIEDADES = [
  'Vistosa',
  '230-A',
  'Jardim',
  '424',
  'Sta Cat.',
  '181-A',
  '181-B',
  'Francos',
  'Bolhão'
];

const FILAS_PROPRIEDADES = [
  ['Vistosa', '230-A', 'Jardim', '424', 'Sta Cat.'],
  ['181-A', '181-B', 'Francos', 'Bolhão']
];

function ordenarProps(props) {
  const ordem = new Map(ORDEM_PROPRIEDADES.map((nome, index) => [nome.toLowerCase(), index]));
  return [...props].sort((a, b) => {
    const ai = ordem.has(a.nome.toLowerCase()) ? ordem.get(a.nome.toLowerCase()) : 999;
    const bi = ordem.has(b.nome.toLowerCase()) ? ordem.get(b.nome.toLowerCase()) : 999;
    return ai - bi || a.nome.localeCompare(b.nome);
  });
}

/**
 * Monta a tabela completa
 * @param {Array[]} dados      Matriz com todas as linhas
 * @param {number[]} rowIndices Índices de linha no Sheets
 */
export function criarTabela(dados, rowIndices) {
  dadosAtuais = JSON.parse(JSON.stringify(dados));
  rowIndicesAtuais = JSON.parse(JSON.stringify(rowIndices));

  const wrapper = document.getElementById('tabela');
  if (!wrapper) return;
  wrapper.innerHTML = '';

  // Cabeçalho/Mapa de propriedades
  const cab = dadosAtuais[0];
  let props = [];
  for (let i = 2; i < cab.length; i += 2) {
    props.push({ nome: cab[i], estadoCol: i, qtdeCol: i + 1 });
  }
  props = ordenarProps(props);
  if (Array.isArray(window.PROPS_TO_SHOW)) {
    props = props.filter(p => window.PROPS_TO_SHOW.includes(p.nome));
  }

  // Agrupar por categoria
  const categorias = new Map();
  for (let i = 2; i < dadosAtuais.length; i++) {
    const row = dadosAtuais[i];
    if (!row || !row[1]) continue;
    const catName = (row[0]?.trim() || 'Outros').toLowerCase();
    if (!categorias.has(catName)) {
      categorias.set(catName, { nome: row[0]?.trim() || 'Outros', items: [] });
    }
    categorias.get(catName).items.push({ row, index: rowIndicesAtuais[i] });
  }

  // Tabela
  const table = document.createElement('table');
  table.className = 'text-xs';
  table.style.tableLayout = 'fixed';
  table.style.borderCollapse = 'separate';
  table.style.borderSpacing = '0';

  // Colgroup: [Total, Artigo, Propriedades, X]
  const colgroup = document.createElement('colgroup');
  // garante visibilidade confortável do X (>= 28–32 px)
  ['var(--col1)', 'var(--col2)', 'var(--props-col)', '34px'].forEach(w => {
    const col = document.createElement('col');
    col.style.width = w;
    colgroup.appendChild(col);
  });
  table.appendChild(colgroup);

  // TBODY
  const tbody = document.createElement('tbody');
  const sortedCats = Array.from(categorias.values()).sort((a,b)=>a.nome.localeCompare(b.nome));

  for (const cat of sortedCats) {
    // Linha de categoria
    const trCat = document.createElement('tr');
    trCat.className = 'categoria';
    const tdCat = document.createElement('td');
    tdCat.colSpan = 4;
    tdCat.textContent = cat.nome;
    trCat.appendChild(tdCat);
    tbody.appendChild(trCat);

    for (const {row, index: sheetRow} of cat.items) {
      const tr = document.createElement('tr');

      // 1) Total
      const tdSum = document.createElement('td');
      tdSum.className = 'text-center align-top tabular-nums';
      tdSum.style.padding = '4px 4px';
      tr.appendChild(tdSum);

      // 2) Artigo
      const tdArt = document.createElement('td');
      tdArt.dataset.tipo = 'artigo';
      tdArt.className = 'text-[11px] relative align-top font-semibold';
      tdArt.style.padding = '5px 6px';

      const spanText = document.createElement('span');
      spanText.textContent = row[1];
      spanText.className = 'block pr-3 leading-3';

      const pencil = document.createElement('span');
      pencil.innerHTML = '&#9998;';
      pencil.className = 'pencil-icon absolute top-1 right-1 text-xs cursor-pointer transition-opacity';
      pencil.style.opacity = modoEdicaoAtivo ? '1' : '0';
      pencil.title = 'Editar artigo';

      tdArt.appendChild(spanText);
      tdArt.appendChild(pencil);
      tr.appendChild(tdArt);

      // 3) Propriedades (2 linhas, 4 por linha)
      const tdProps = document.createElement('td');
      tdProps.className = 'align-top';
      tdProps.style.padding = '4px 8px';

      const segmentos = props.map(p => ({
        nome: p.nome,
        estadoCol: p.estadoCol,
        qtdeCol : p.qtdeCol,
        estado  : row[p.estadoCol] || '',
        qty     : row[p.qtdeCol] || '0'
      }));

      const porNome = new Map(segmentos.map(segmento => [segmento.nome.toLowerCase(), segmento]));
      const nomesEmFila = new Set();
      const linhas = FILAS_PROPRIEDADES
        .map(fila => fila
          .map(nome => {
            nomesEmFila.add(nome.toLowerCase());
            return porNome.get(nome.toLowerCase());
          })
          .filter(Boolean))
        .filter(fila => fila.length);
      const restantes = segmentos.filter(segmento => !nomesEmFila.has(segmento.nome.toLowerCase()));
      if (restantes.length) linhas.push(...chunkArray(restantes, 4));

      const container = document.createElement('div');
      container.className = 'aloj-container space-y-0.5';

      linhas.forEach(linha => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'property-row grid grid-cols-5 gap-x-1 gap-y-0.5 text-[10px] leading-3';
        linha.forEach(seg => {
          const wrap = document.createElement('span');
          const cls = classesPorEstado(seg.estado);
          wrap.className = `wrap-prop px-1.5 py-0 ${cls.wrap}`;
          wrap.style.userSelect = 'none';

          // Nome (alterna F/C/R)
          const btnNome = document.createElement('span');
          btnNome.textContent = seg.nome + ': ';
          btnNome.className = `${cls.name}`;
          btnNome.title = 'Clique para alternar F/C/R';
          btnNome.addEventListener('click', async (e) => {
            if (!modoEdicaoAtivo) return;
            e.stopPropagation();
            const cycle = {'':'F','F':'C','C':'R','R':'F'};
            const next = cycle[row[seg.estadoCol] || ''];
            row[seg.estadoCol] = next;

            const novoCls = classesPorEstado(next);
            wrap.className = `wrap-prop px-1.5 py-0 ${novoCls.wrap}`;
            btnNome.className = `${novoCls.name}`;
            btnQty.className = `ml-0.5 tabular-nums ${novoCls.qty}`;

            atualizarEstado('A enviar alteração...');
            try {
              await atualizarCelula(sheetRow, seg.estadoCol + 1, next, seg.nome);
              await atualizarLista();
              atualizarEstado('Pronto');
            } catch (error) {
              console.error('Erro ao atualizar estado:', error);
              atualizarEstado('Erro ao atualizar estado.');
            }
          });

          // Quantidade (edita inline)
          const btnQty = document.createElement('span');
          btnQty.textContent = seg.qty;
          btnQty.className = `ml-0.5 tabular-nums ${cls.qty}`;
          btnQty.title = 'Clique para editar quantidade';

          btnQty.addEventListener('click', (e) => {
            if (!modoEdicaoAtivo) return;
            e.stopPropagation();

            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.max = '1000';
            input.value = String(row[seg.qtdeCol] || '0');
            input.className = 'w-12 text-[11px] text-center border rounded px-1 py-0.5';
            btnQty.replaceWith(input);
            input.focus();
            input.select();

            const finish = async () => {
              const novo = input.value.trim();
              row[seg.qtdeCol] = novo;
              btnQty.textContent = novo || '0';
              input.replaceWith(btnQty);
              updateSumAndArt();

              atualizarEstado('A enviar quantidade...');
              try {
                await atualizarCelula(sheetRow, seg.qtdeCol + 1, novo, seg.nome);
                await atualizarLista();
                atualizarEstado('Pronto');
              } catch (error) {
                console.error('Erro ao atualizar quantidade:', error);
                atualizarEstado('Erro ao atualizar quantidade.');
              }
            };

            input.addEventListener('keydown', (ev) => {
              if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
              if (ev.key === 'Escape') { ev.preventDefault(); input.replaceWith(btnQty); }
            });
            input.addEventListener('blur', finish);
          });

          wrap.appendChild(btnNome);
          wrap.appendChild(btnQty);
          rowDiv.appendChild(wrap);
        });
        container.appendChild(rowDiv);
      });

      tdProps.appendChild(container);
      tr.appendChild(tdProps);

      // 4) Delete (❌) — visível só em edição por CSS (body.editing-on)
      const tdDel = document.createElement('td');
      tdDel.dataset.tipo = 'delete';
      tdDel.textContent = String.fromCharCode(215);
      tdDel.disabled = true;
      tdDel.className = 'text-center opacity-50 cursor-pointer text-sm align-top text-red-700 font-bold';
      tdDel.style.padding = '4px 4px';
      tdDel.addEventListener('click', async () => {
        if (!modoEdicaoAtivo) return;
        if (!confirm(`Eliminar “${row[1]}”?`)) return;
        atualizarEstado('Eliminando...');
        await apagarArtigo(sheetRow);
        tr.remove();
        atualizarEstado('Pronto');
      });
      tr.appendChild(tdDel);

      // Totais/cores do Artigo
      function updateSumAndArt() {
        let sum = 0;
        let bought = 0;
        const estLines = props.map(p => row[p.estadoCol]);
        props.forEach(p => {
          if (row[p.estadoCol] === 'F') {
            const v = parseInt(row[p.qtdeCol], 10);
            if (!isNaN(v)) sum += v;
          } else if (row[p.estadoCol] === 'C') {
            const v = parseInt(row[p.qtdeCol], 10);
            if (!isNaN(v)) bought += v;
          }
        });
        tdSum.innerHTML = '';
        const falta = document.createElement('div');
        falta.textContent = sum > 0 ? sum : '';
        falta.className = 'font-bold text-[12px] leading-3';
        tdSum.appendChild(falta);
        if (bought > 0) {
          const comprado = document.createElement('div');
          comprado.textContent = bought;
          comprado.className = 'inline-block rounded bg-amber-100 px-1 text-[10px] leading-3 font-normal text-amber-700';
          tdSum.appendChild(comprado);
        }

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

      // Edição do Artigo (texto + categoria)
      function enterEditMode() {
        if (!modoEdicaoAtivo) return;

        const inputArtigo = document.createElement('textarea');
        inputArtigo.rows = 2;
        inputArtigo.value = spanText.textContent;
        inputArtigo.className = 'w-full min-h-9 resize-none text-xs leading-4 border rounded px-1 py-0.5 mb-1';

        const categoriasUnicas = Array.isArray(window.TODAS_CATEGORIAS)
          ? window.TODAS_CATEGORIAS
          : Array.from(new Set((dadosAtuais || []).slice(2).map(r => r?.[0]).filter(Boolean)));

        const selectCat = document.createElement('select');
        selectCat.className = 'w-full min-h-9 text-xs leading-4 border rounded px-1 py-0.5 mb-1';
        categoriasUnicas.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c;
          opt.textContent = c;
          if (c === row[0]) opt.selected = true;
          selectCat.appendChild(opt);
        });

        const optNova = document.createElement('option');
        optNova.value = '__nova__';
        optNova.textContent = '➕ Adicionar Nova';
        selectCat.appendChild(optNova);

        if (row[0] && !categoriasUnicas.includes(row[0])) {
          const opt = document.createElement('option');
          opt.value = row[0];
          opt.textContent = row[0];
          opt.selected = true;
          selectCat.insertBefore(opt, selectCat.firstChild);
        }

        selectCat.addEventListener('change', () => {
          if (selectCat.value === '__nova__') {
            const nova = prompt('Nova categoria:');
            if (nova && !categoriasUnicas.includes(nova)) {
              const opt = document.createElement('option');
              opt.value = nova;
              opt.textContent = nova;
              opt.selected = true;
              selectCat.insertBefore(opt, optNova);
              selectCat.value = nova;
            } else if (nova) {
              selectCat.value = nova;
            } else {
              selectCat.selectedIndex = 0;
            }
          }
        });

        const container = document.createElement('div');
        container.appendChild(inputArtigo);
        container.appendChild(selectCat);
        spanText.replaceWith(container);
        pencil.style.opacity = '0';
        inputArtigo.focus();

        async function finishEdit() {
          const categoriaFinal = selectCat.value;
          const novoArtigo = inputArtigo.value.trim();
          container.replaceWith(spanText);
          spanText.textContent = novoArtigo;
          pencil.style.opacity = modoEdicaoAtivo ? '1' : '0';

          if (novoArtigo !== row[1]) {
            row[1] = novoArtigo;
            atualizarEstado('A enviar artigo...');
            try { await atualizarCelula(sheetRow, 2, novoArtigo); } catch {}
            atualizarEstado('Pronto');
          }
          if (categoriaFinal !== row[0]) {
            row[0] = categoriaFinal;
            atualizarEstado('A enviar categoria...');
            try { await atualizarCelula(sheetRow, 1, categoriaFinal); } catch {}
            atualizarEstado('Pronto');
          }
        }

        container.addEventListener('focusout', () => {
          setTimeout(() => {
            if (!container.contains(document.activeElement)) finishEdit();
          }, 0);
        });
        inputArtigo.addEventListener('keydown', e => { if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); inputArtigo.blur(); } });
        selectCat.addEventListener('keydown', e => { if (e.key==='Enter'){ e.preventDefault(); selectCat.blur(); } });
      }
      pencil.addEventListener('click', enterEditMode);
      spanText.addEventListener('dblclick', enterEditMode);

      // pintar totais ao render
      (function updateOnce(){ 
        try { 
          // inicializa total/cor
          const fn = tr.querySelector; // apenas para manter a ordem
        } catch {}
      })();
      tbody.appendChild(tr);
      // após inserir na DOM parcial, corre a soma/cor
      (function runSum(){ 
        const estLines = props.map(p => row[p.estadoCol]);
        let sum = 0; 
        let bought = 0;
        props.forEach(p => {
          const v=parseInt(row[p.qtdeCol],10);
          if (row[p.estadoCol]==='F' && !isNaN(v)) sum+=v;
          if (row[p.estadoCol]==='C' && !isNaN(v)) bought+=v;
        });
        tdSum.innerHTML = '';
        const falta = document.createElement('div');
        falta.textContent = sum > 0 ? sum : '';
        falta.className = 'font-bold text-[12px] leading-3';
        tdSum.appendChild(falta);
        if (bought > 0) {
          const comprado = document.createElement('div');
          comprado.textContent = bought;
          comprado.className = 'inline-block rounded bg-amber-100 px-1 text-[10px] leading-3 font-normal text-amber-700';
          tdSum.appendChild(comprado);
        }
        tdSum.classList.remove('bg-red-100','bg-yellow-100','text-red-800');
        spanText.classList.remove('bg-red-100','bg-yellow-100','text-red-800');
        if (estLines.includes('F')) { tdSum.classList.add('bg-red-100','text-red-800'); spanText.classList.add('bg-red-100','text-red-800'); }
        else if (estLines.includes('C')) { tdSum.classList.add('bg-yellow-100'); spanText.classList.add('bg-yellow-100'); }
      })();

      if (window.AUTO_EDIT_ROW_ID === sheetRow) {
        window.AUTO_EDIT_ROW_ID = null;
        setTimeout(enterEditMode, 0);
      }
    }
  }

  table.appendChild(tbody);
  wrapper.appendChild(table);

  // Chamada protegida (evita “Erro ao carregar dados” se a função não existir)
  if (typeof updateStickyOffset === 'function') {
    try { updateStickyOffset(); } catch {}
  }

  if (modoEdicaoAtivo) aplicarModoEdicao();
}

/* Sugestões: posicionamento flutuante */
function positionSuggestions() {
  const input = document.getElementById('searchInput');
  const list = document.getElementById('suggestions');
  if (!input || !list) return;

  const rect = input.getBoundingClientRect();
  list.style.position = 'absolute';
  list.style.top = (rect.bottom + window.scrollY + 4) + 'px';
  list.style.left = (rect.left + window.scrollX) + 'px';
  list.style.width = rect.width + 'px';
}

function attachSuggestionsToBody() {
  const list = document.getElementById('suggestions');
  if (!list) return;
  if (list.parentElement !== document.body) document.body.appendChild(list);

  positionSuggestions();
  window.addEventListener('resize', positionSuggestions);
  window.addEventListener('scroll', positionSuggestions, true);
  const input = document.getElementById('searchInput');
  if (input) {
    input.addEventListener('input', positionSuggestions);
    input.addEventListener('focus', positionSuggestions);
  }
}

document.addEventListener('DOMContentLoaded', attachSuggestionsToBody);
