document.addEventListener('DOMContentLoaded', () => {
  console.log('main.js carregado');

  import('./ui.js').then(({ criarTabela, atualizarEstado, toggleModoEdicao }) => {
    const API_URL = 'https://script.google.com/macros/s/AKfycbyVUwW8_VNHxgutACoBX5cWAqJwxyIPZX1dwrGsSYD1FsLG1pdw_MGt9tjY4WxZEZMs/exec';

    // Função para buscar dados do Excel
    async function buscarDados() {
      atualizarEstado('A carregar dados do Sheets...');
      const res = await fetch(API_URL);
      const json = await res.json();
      return JSON.parse(JSON.stringify(json.dados));
    }

    async function carregarDados() {
      try {
        const dados = await buscarDados();
        criarTabela(dados);
        atualizarEstado('Pronto');
      } catch (err) {
        console.error(err);
        atualizarEstado('Erro ao carregar dados.');
      }
    }

    async function filtrarFaltas() {
      try {
        const dados = await buscarDados();
        atualizarEstado('A aplicar filtro de faltas...');
        const filtrados = [dados[0], dados[1]];
        for (let i = 2; i < dados.length; i++) {
          const linha = dados[i];
          for (let j = 2; j < linha.length; j += 2) {
            if (linha[j] === 'F') { filtrados.push(linha); break; }
          }
        }
        criarTabela(filtrados);
        atualizarEstado('Pronto');
      } catch (err) {
        console.error(err);
        atualizarEstado('Erro ao filtrar dados.');
      }
    }

    async function mostrarTudo() {
      // Recarrega diretamente do Sheets
      await carregarDados();
    }

    // Ligar eventos
    document.getElementById('mostrarFaltas').addEventListener('click', filtrarFaltas);
    document.getElementById('mostrarTudo').addEventListener('click', mostrarTudo);
    document.getElementById('modoEdicao').addEventListener('click', toggleModoEdicao);

    // Carrega inicial
    carregarDados();
  });
});
