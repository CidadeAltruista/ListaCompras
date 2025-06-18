import { criarTabela, obterDadosAtuais, atualizarEstado } from './ui.js';

let dadosOriginais = [];

async function carregarDados() {
  atualizarEstado('A carregar dados...');
  try {
    const resposta = await fetch('https://script.google.com/macros/s/AKfycbxgVfBNQhn7npWuc9m0LlSmC6F08yYGLS0ULLqt4UvnjbBeuKhI39rWn13fleeflCo50g/exec');
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
  const dados = obterDadosAtuais();
  criarTabela(dados);
  atualizarEstado('Pronto');
}

document.getElementById('mostrarFaltas').addEventListener('click', filtrarFaltas);
document.getElementById('mostrarTudo').addEventListener('click', mostrarTudo);
document.getElementById('modoEdicao').addEventListener('click', () => {
  import('./ui.js').then(m => m.toggleModoEdicao());
});

carregarDados();
