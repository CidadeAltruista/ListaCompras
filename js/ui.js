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
  for (let i=2; i<cab.length; i+=2) props.push({ nome:cab[i], estadoCol:i, qtdeCol:i+1});

  // tabela
  const table = document.createElement('table');
  table.className = 'min-w-full bg-white shadow rounded text-sm';

  // cabeçalho
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Total em Falta','Artigo', ...props.map(p=>p.nome)].forEach((txt,idx)=>{
    const th = document.createElement('th');
    th.textContent = txt;
    th.colSpan = idx<2?1:2;
    th.className = 'px-2 py-1 bg-gray-200 text-center';
    if(idx===1) th.classList.replace('text-center','text-left');
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (let idx=2; idx<dadosAtuais.length; idx++) {
    const row = dadosAtuais[idx], sheetRow=rowIndicesAtuais[idx];
    if (!row[1]) continue;
    const tr = document.createElement('tr');

    // Total em Falta
    const tdSum = document.createElement('td');
    tdSum.className = 'border px-2 py-1 text-center font-semibold';
    tr.appendChild(tdSum);

    // Artigo
    const tdArt = document.createElement('td');
    tdArt.textContent = row[1];
    tdArt.className = 'border px-3 py-1'; // altura menor
    tr.appendChild(tdArt);

    // recalc função
    function updateSum() {
      let s=0;
      props.forEach(p=>{
        if(row[p.estadoCol]==='F'){
          const v=parseInt(row[p.qtdeCol],10);
          if(!isNaN(v)) s+=v;
        }
      });
      tdSum.textContent = s>0?s:'';
      tdArt.classList.remove('bg-red-100','bg-yellow-100');
      const es = props.map(p=>row[p.estadoCol]);
      if(es.includes('F')) tdArt.classList.add('bg-red-100','text-red-800');
      else if(es.includes('C')) tdArt.classList.add('bg-yellow-100');
    }

    // para cada par Estado/Qtde
    props.forEach(({estadoCol,qtdeCol})=>{
      // Estado
      const tdE = document.createElement('td');
      tdE.dataset.tipo = 'estado';
      tdE.disabled = true;
      tdE.className='border px-2 py-1 text-center opacity-50 cursor-pointer';

      // Mapa de ícones
      const icons = { 'F':'❌','C':'✔️','R':'✔️' };
      const colors= { 'F':'text-red-600','C':'text-yellow-600','R':'text-green-600' };
      const val = row[estadoCol]||'';
      tdE.innerHTML = val?`<span class="${colors[val]||''}">${icons[val]}</span>`:'';

      tdE.addEventListener('click',async()=>{
        if(!modoEdicaoAtivo) return;
        const cycle={'':'F','F':'C','C':'R','R':'F'};
        const novo = cycle[row[estadoCol]]||'F';
        row[estadoCol]=novo;
        tdE.innerHTML=`<span class="${colors[novo]}">${icons[novo]}</span>`;
        updateSum();
        atualizarEstado('A enviar alteração...');
        await atualizarCelula(sheetRow, estadoCol+1, novo);
        atualizarEstado('Pronto');
      });

      // Qtde
      const tdQ = document.createElement('td');
      tdQ.className='border px-2 py-1';
      const inp=document.createElement('input');
      inp.type='number'; inp.min=0; inp.max=1000;
      inp.value=row[qtdeCol]||'';
      inp.disabled=true;
      inp.className='w-full text-xs text-center border rounded px-1 py-1 opacity-50';

      // debounce e cor de fundo
      let db;
      inp.addEventListener('input',()=>{
        if(!modoEdicaoAtivo) return;
        clearTimeout(db);
        db=setTimeout(async()=>{
          row[qtdeCol]=inp.value;
          updateSum();
          atualizarEstado('A enviar quantidade...');
          await atualizarCelula(sheetRow, qtdeCol+1, inp.value);
          atualizarEstado('Pronto');
        },300);
      });

      tr.appendChild(tdE);
      tdQ.appendChild(inp);
      tr.appendChild(tdQ);
    });

    updateSum();
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrapper.appendChild(table);
  if(modoEdicaoAtivo) aplicarModoEdicao();
}
