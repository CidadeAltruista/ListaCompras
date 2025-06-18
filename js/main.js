import { obterDados } from './api.js';
import { criarTabela, ativarModoEdicao } from './ui.js';

let dadosGlobais = [];

async function carregar() {
  dadosGlobais = await obterDados();
  criarTabela(dadosGlobais);
}

document.getElementById('filtroF').addEventListener('click', () => {
  const cabecalho = dadosGlobais[0];
  const subcabecalho = dadosGlobais[1];
  const propriedades = [];

  for (let i = 2; i < cabecalho.length; i += 2) {
    propriedades.push(i);
  }

  const filtrados = [cabecalho, subcabecalho].concat(
    dadosGlobais.slice(2).filter(linha => {
      if (!linha[1]) return false;
      return propriedades.some(i => linha[i] === 'F');
    })
  );

  criarTabela(filtrados);
});

document.getElementById('filtroReset').addEventListener('click', () => {
  criarTabela(dadosGlobais);
});

document.getElementById('modoEdicao').addEventListener('click', () => {
  ativarModoEdicao();
});

carregar();
