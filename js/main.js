import { obterDados } from './api.js';
import { criarTabela, ativarModoEdicao, atualizarEstado } from './ui.js';

let dadosGlobais = [];

async function carregar() {
  atualizarEstado('A receber dados...');
  try {
    dadosGlobais = await obterDados();
    criarTabela(dadosGlobais);
    atualizarEstado('Pronto');
  } catch (e) {
    atualizarEstado('Erro ao carregar dados.');
    console.error(e);
  }
}

document.getElementById('filtroF').addEventListener('click', () => {
  atualizarEstado('A aplicar filtro...');
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
  atualizarEstado('Filtro aplicado');
});

document.getElementById('filtroReset').addEventListener('click', () => {
  atualizarEstado('A remover filtro...');
  criarTabela(dadosGlobais);
  atualizarEstado('Pronto');
});

document.getElementById('modoEdicao').addEventListener('click', () => {
  ativarModoEdicao();
  atualizarEstado('Modo edição ativado');
});

carregar();
