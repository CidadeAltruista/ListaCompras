import { atualizarCelula } from './api.js';

let modoEdicaoAtivo   = false;
let dadosAtuais       = [];
let rowIndicesAtuais  = [];

/** Mostra mensagem de estado (com animação tipo “typing”) */
let _estadoTimer; // opcional
export function atualizarEstado(msg) {
  const el = document.getElementById('estado');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('estado-typing');
  void el.offsetWidth; // reflow para reiniciar a animação
  el.style.setProperty('--estado-ch', `${msg.length}ch`);
  el.style.animation = `estadoTyping 1400ms steps(${Math.max(msg.length, 1)}) forwards`;
  el.classList.add('estado-typing');
}

/** Alterna entre Edição / Concluir */
export function toggleModoEdicao() {
  modoEdicaoAtivo = !modoEdicaoAtivo;
  aplicarModoEdicao();
}

/** Habilita/desabilita controles e lápis + classe no <body> */
export function aplicarModoEdicao() {
  const botao = document.getElementById('modoEdicao');
  if (botao) botao.textContent = modoEdicaoAtivo ? 'Concluir' : 'Edição';

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
    case 'F': return { wrap: 'bg-red-100 text-red-800',    name: 'underline', qty: 'font-semibold' };
    case 'C': return { wrap: 'bg-yellow-100 text-yellow-800', name: 'underline', qty: 'font-semibold' };
    case 'R': return { wrap: 'bg-green-100 text-green-800',  name: 'underline', qty: 'font-semibold' };
    default : return { wrap: 'text-gray-600', name: '', qty: '' };
  }
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
  table.className = 'bg-white shadow rounded text-xs';
  table.style.tableLayout = 'fixed';
  table.style.borderCollapse = 'collapse';
  table.style.width = '450px'; // ajusta aqui o total se quiseres

  // Colgroup: [Total, Artigo, Propriedades, X]
  const colgroup = document.createElement('colgroup');
  // garante visibilidade confortável do X (>= 28–32 px)
  ['25px', '90px', 'auto', '32px'].forEach(w => {
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
      tdSum.className = 'border text-center font-semibold text-xs align-top';
      tdSum.style.padding = '4px 4px 4px 6px';
      tr.appendChild(tdSum);

      // 2) Artigo
      const tdArt = document.createElement('td');
      tdArt.dataset.tipo = 'artigo';
      tdArt.className = 'border text-xs relative align-top';
      tdArt.style.padding = '4px 6px';

      const spanText = document.createElement('span');
      spanText.textContent = row[1];
      spanText.className = 'pr-4';

      const pencil = document.createElement('span');
      pencil.innerHTML = '✏️';
      pencil.className = 'pencil-icon absolute top-1 right-1 text-xs cursor-pointer transition-opacity';
      pencil.style.opacity = modoEdicaoAtivo ? '1' : '0';
      pencil.title = 'Editar artigo';

      tdArt.appendChild(spanText);
      tdArt.appendChild(pencil);
      tr.appendChild(tdArt);

      // 3) Propriedades (2 linhas, 4 por linha)
      const tdProps = document.createElement('td');
      tdProps.className = 'border align-top';
      tdProps.style.padding = '4px 6px';

      const segmentos = props.map(p => ({
        nome: p.nome,
        estadoCol: p.estadoCol,
        qtdeCol : p.qtdeCol,
        estado  : row[p.estadoCol] || '',
        qty     : row[p.qtdeCol] || '0'
      }));

      let linhas = chunkArray(segmentos, 4);
      const MAX_LINHAS = 2;
      const excedente = Math.max(0, linhas.length - MAX_LINHAS);
      linhas = linhas.slice(0, MAX_LINHAS);

      const container = document.createElement('div');
      container.className = 'aloj-container space-y-0.5';

      linhas.forEach(linha => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-4';
        linha.forEach(seg => {
          const wrap = document.createElement('span');
          const cls = classesPorEstado(seg.estado);
          wrap.className = `wrap-prop px-1 py-0.5 rounded ${cls.wrap}`;
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
            wrap.className = `wrap-prop px-1 py-0.5 rounded ${novoCls.wrap}`;
            btnNome.className = `${novoCls.name}`;
            btnQty.className = `ml-0.5 tabular-nums ${novoCls.qty}`;

            atualizarEstado('A enviar alteração...');
            await atualizarCelula(sheetRow, seg.estadoCol + 1, next);
            atualizarEstado('Pronto');
            updateSumAndArt();
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
              await atualizarCelula(sheetRow, seg.qtdeCol + 1, novo);
              atualizarEstado('Pronto');
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

      if (excedente > 0) {
        const badge = document.createElement('div');
        badge.className = 'text-[10px] leading-4 text-gray-500';
        const restantes = Math.max(0, segmentos.length - 8); // 8 = 2 linhas * 4
        badge.textContent = `+${restantes} alojamento(s) oculto(s)`;
        container.appendChild(badge);
      }

      tdProps.appendChild(container);
      tr.appendChild(tdProps);

      // 4) Delete (❌) — visível só em edição por CSS (body.editing-on)
      const tdDel = document.createElement('td');
      tdDel.dataset.tipo = 'delete';
      tdDel.textContent = '❌';
      tdDel.disabled = true;
      tdDel.className = 'border px-2 py-1 text-center opacity-50 cursor-pointer text-xs align-top';
      tdDel.style.padding = '4px';
      tdDel.addEventListener('click', async () => {
        if (!modoEdicaoAtivo) return;
        if (!confirm(`Eliminar “${row[1]}”?`)) return;
        atualizarEstado('Eliminando...');
        await atualizarCelula(sheetRow, 2, '');
        tr.remove();
        atualizarEstado('Pronto');
      });
      tr.appendChild(tdDel);

      // Totais/cores do Artigo
      function updateSumAndArt() {
        let sum = 0;
        const estLines = props.map(p => row[p.estadoCol]);
        props.forEach(p => {
          if (row[p.estadoCol] === 'F') {
            const v = parseInt(row[p.qtdeCol], 10);
            if (!isNaN(v)) sum += v;
          }
        });
        tdSum.textContent = sum > 0 ? sum : '';

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

        const inputArtigo = document.createElement('input');
        inputArtigo.type  = 'text';
        inputArtigo.value = spanText.textContent;
        inputArtigo.className = 'w-full text-xs border rounded px-1 py-0.5 mb-1';

        const categoriasUnicas = Array.isArray(window.TODAS_CATEGORIAS)
          ? window.TODAS_CATEGORIAS
          : Array.from(new Set((dadosAtuais || []).slice(2).map(r => r?.[0]).filter(Boolean)));

        const selectCat = document.createElement('select');
        selectCat.className = 'w-full text-xs border rounded px-1 py-0.5 mb-1';
        categoriasUnicas.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c; opt.textContent = c;
          if (c === row[0]) opt.selected = true;
          selectCat.appendChild(opt);
        });
        const optNova = document.createElement('option');
        optNova.value = '__nova__';
        optNova.textContent = '➕ Adicionar Nova';
        selectCat.appendChild(optNova);
        if (row[0] && !categoriasUnicas.includes(row[0])) {
          const opt = document.createElement('option');
          opt.value = row[0]; opt.textContent = row[0];
          opt.selected = true;
          selectCat.insertBefore(opt, selectCat.firstChild);
        }
        selectCat.addEventListener('change', () => {
          if (selectCat.value === '__nova__') {
            const nova = prompt('Nova categoria:');
            if (nova && !categoriasUnicas.includes(nova)) {
              const opt = document.createElement('option');
              opt.value = nova; opt.textContent = nova; opt.selected = true;
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
        inputArtigo.addEventListener('keydown', e => { if (e.key==='Enter'){ e.preventDefault(); inputArtigo.blur(); } });
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
        props.forEach(p => { if (row[p.estadoCol]==='F'){ const v=parseInt(row[p.qtdeCol],10); if(!isNaN(v)) sum+=v; }});
        tdSum.textContent = sum > 0 ? sum : '';
        tdSum.classList.remove('bg-red-100','bg-yellow-100','text-red-800');
        spanText.classList.remove('bg-red-100','bg-yellow-100','text-red-800');
        if (estLines.includes('F')) { tdSum.classList.add('bg-red-100','text-red-800'); spanText.classList.add('bg-red-100','text-red-800'); }
        else if (estLines.includes('C')) { tdSum.classList.add('bg-yellow-100'); spanText.classList.add('bg-yellow-100'); }
      })();
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
