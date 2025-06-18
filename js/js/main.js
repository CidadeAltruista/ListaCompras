import { obterDados } from './api.js';
import { criarTabela } from './ui.js';

let dadosGlobais = [];

async function carregar() {
  dadosGlobais = await obterDados();
  criarTabela(dadosGlobais);
}

document.getElementById('filtroF').addEventListener('click', () => {
  const filtrados = [dadosGlobais[0]].concat(
    dadosGlobais.slice(1).filter(linha => linha.slice(2).includes('F'))
  );
  criarTabela(filtrados);
});

document.getElementById('filtroReset').addEventListener('click', () => {
  criarTabela(dadosGlobais);
});

carregar();
