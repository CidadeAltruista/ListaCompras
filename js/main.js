import { criarTabela, obterDadosAtuais, atualizarEstado } from './ui.js';

let dadosOriginais = [];

async function carregarDados() {
  atualizarEstado('A carregar dados...');
  try {
    const resposta = await fetch('https://script.google.com/macros/s/AKfycbyVUwW8_VNHxgutACoBX5cWAqJwxyIPZX1dwrGsSYD1FsLG1pdw_MGt9tjY4WxZEZMs/exec');
    const json = await resposta.json();

    if (!json || !json.dados || !Array.isArray(json.dados)) {
      throw new Error('Resposta inesperada do servidor');
    }

    dadosOriginais = json.dados;
    criarTabela(JSON.parse(JSON.stringify(dadosOriginais))); // clone defensivo
    atualizarEstado('Pronto');
  } catch (e) {
    console.error(e);
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
  const dados = obterDadosAtuais();
  criarTabela(dados);
  atualizarEstado('Pronto');
}

document.getElementById('filtroF').addEventListener('click', filtrarFaltas);
document.getElementById('filtroReset').addEventListener('click', mostrarTudo);
document.getElementById('modoEdicao').addEventListener('click', () => {
  import('./ui.js').then(m => m.toggleModoEdicao());
});

carregarDados();
