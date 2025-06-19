import { criarTabela, atualizarEstado, toggleModoEdicao } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const sheetURL = 'https://script.google.com/macros/s/AKfycbyVUwW8_VNHxgutACoBX5cWAqJwxyIPZX1dwrGsSYD1FsLG1pdw_MGt9tjY4WxZEZMs/exec';

  let dados = [], rows = [];

  function normalizeText(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  }

  async function carregarDados() {
    atualizarEstado('A carregar dados...');
    try {
      const res  = await fetch(sheetURL);
      const json = await res.json();
      dados = JSON.parse(JSON.stringify(json.dados));
      rows = dados.map((_,i)=>i+1);
      criarTabela(dados, rows);
      atualizarEstado('Pronto');
    } catch {
      atualizarEstado('Erro ao carregar dados.');
    }
  }

  // Mostra linhas com F ou C
  async function filtrarFaltas() {
    atualizarEstado('A aplicar filtro...');
    await carregarDados();
    const c = [dados[0], dados[1]], r=[rows[0], rows[1]];
    for(let i=2;i<dados.length;i++){
      const linha = dados[i];
      for(let j=2;j<linha.length;j+=2){
        if(linha[j]==='F'||linha[j]==='C'){
          c.push(linha); r.push(rows[i]);
          break;
        }
      }
    }
    criarTabela(c,r);
    atualizarEstado('Pronto');
  }

  async function mostrarTudo() {
    atualizarEstado('A mostrar todos...');
    await carregarDados();
  }

  // Botões
  document.getElementById('mostrarFaltas').addEventListener('click', filtrarFaltas);
  document.getElementById('mostrarTudo').addEventListener('click', mostrarTudo);
  document.getElementById('modoEdicao').addEventListener('click', toggleModoEdicao);

  // Pesquisa (permanece ativa sempre—não é afetada por aplicarModoEdicao)
  const inp = document.getElementById('searchInput'),
        sug = document.getElementById('suggestions');
  inp.addEventListener('input', ()=>{
    const term = normalizeText(inp.value.trim());
    sug.innerHTML = '';
    if(!term) return;
    const hits=[];
    for(let i=2;i<dados.length;i++){
      const a = dados[i][1]; if(!a)continue;
      const n = normalizeText(a), idx = n.indexOf(term);
      if(idx!==-1) hits.push({idx,i,a});
    }
    hits.sort((x,y)=>x.idx-y.idx).slice(0,5).forEach(h=>{
      const li=document.createElement('li');
      li.textContent=h.a;
      li.className='px-2 py-1 hover:bg-gray-200 cursor-pointer text-xs';
      li.addEventListener('click',()=>{
        criarTabela(
          [dados[0],dados[1],dados[h.i]],
          [rows[0],rows[1],rows[h.i]]
        );
        sug.innerHTML=''; inp.value='';
      });
      sug.appendChild(li);
    });
    // opção adicionar omitida por brevidade...
  });
  document.addEventListener('click', e=>{
    if(!inp.contains(e.target)&&!sug.contains(e.target)) sug.innerHTML='';
  });

  carregarDados();
});
