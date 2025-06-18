document.addEventListener('DOMContentLoaded', () => {
  console.log('main.js carregado');

  import('./ui.js').then(({ criarTabela, obterDadosAtuais, atualizarEstado, toggleModoEdicao }) => {
    let dadosOriginais = [];

    async function carregarDados() {
      atualizarEstado('A carregar dados...');
      try {
        const resposta = await fetch('https://script.google.com/macros/s/AKfycbyVUwW8_VNHxgutACoBX5cWAqJwxyIPZX1dwrGsSYD1FsLG1pdw_MGt9tjY4WxZEZMs/exec');
        const json = await resposta.json();
        dadosOriginais = JSON.parse(JSON.stringify(json.dados)); // clone defensivo
        criarTabela(dadosOriginais);
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

    // **Aqui usamos os IDs que existem no teu HTML:**
    document.getElementById('mostrarFaltas').addEventListener('click', filtrarFaltas);
    document.getElementById('mostrarTudo').addEventListener('click', mostrarTudo);
    document.getElementById('modoEdicao').addEventListener('click', toggleModoEdicao);

    carregarDados();
  });
});
