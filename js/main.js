import { criarTabela, obterDadosAtuais, atualizarEstado } from './ui.js';

let dadosOriginais = [];

async function carregarDados() {
  atualizarEstado('A carregar dados...');
  try {
    const resposta = await fetch('https://script.google.com/macros/s/AKfycbyVUwW8_VNHxgutACoBX5cWAqJwxyIPZX1dwrGsSYD1FsLG1pdw_MGt9tjY4WxZEZMs/exec');
    const json = await resposta.json();
    dadosOriginais = json.dados;
    criarTabela(dadosOriginais);
    atualizarEstado('Pronto');
  } catch (e) {
    atualizarEstado('Erro ao carregar dados.');
  }
}

function filtrarFaltas() {
  atualizarEstado('A aplicar filtro de faltas...');
  const dados = obterDadosAtuais();
  const filtrados = [dados[0], dados[1]];
  for (let i = 2; i < dados.length; i++) {
    const linha = dados[i];
    for (let j = 2; j < linha.length; j += 2) {
      if (linha[j] === 'F') {
        filtrados.push(linha);
        break;
      }
    }
  }
  criarTabela(filtrados);
  atualizarEstado('Pronto');
}

function mostrarTudo() {
  atualizarEstado('A mostrar todos os dados...');
  criarTabela(dadosOriginais); // em vez de usar obterDadosAtuais()
  atualizarEstado('Pronto');
}


document.getElementById('mostrarFaltas').addEventListener('click', filtrarFaltas);
document.getElementById('mostrarTudo').addEventListener('click', mostrarTudo);
document.getElementById('modoEdicao').addEventListener('click', () => {
  import('./ui.js').then(m => m.toggleModoEdicao());
});

carregarDados();
