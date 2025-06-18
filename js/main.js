document.addEventListener('DOMContentLoaded', () => {
  console.log('main.js carregado');

  import('./ui.js').then(({ criarTabela, atualizarEstado, toggleModoEdicao }) => {
    // 1) guarda aqui sempre todos os dados (pós‐fetch e pós‐edições)
    let dadosComAlteracoes = [];

    async function carregarDados() {
      atualizarEstado('A carregar dados...');
      try {
        const res = await fetch('https://script.google.com/macros/s/AKfycbyVUwW8_VNHxgutACoBX5cWAqJwxyIPZX1dwrGsSYD1FsLG1pdw_MGt9tjY4WxZEZMs/exec');
        const json = await res.json();
        // cópia profunda para podermos editar sem perder o original
        dadosComAlteracoes = JSON.parse(JSON.stringify(json.dados));
        criarTabela(dadosComAlteracoes);
        atualizarEstado('Pronto');
      } catch (err) {
        console.error(err);
        atualizarEstado('Erro ao carregar dados.');
      }
    }

    function filtrarFaltas() {
      atualizarEstado('A aplicar filtro de faltas...');
      const filtrados = [dadosComAlteracoes[0], dadosComAlteracoes[1]];
      for (let i = 2; i < dadosComAlteracoes.length; i++) {
        const linha = dadosComAlteracoes[i];
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
      // aqui usamos sempre o array completo armazenado em dadosComAlteracoes
      criarTabela(dadosComAlteracoes);
      atualizarEstado('Pronto');
    }

    // ligações de eventos — IDs coincidem com o teu HTML
    document.getElementById('mostrarFaltas').addEventListener('click', filtrarFaltas);
    document.getElementById('mostrarTudo').addEventListener('click', mostrarTudo);
    document.getElementById('modoEdicao').addEventListener('click', toggleModoEdicao);

    // arranca tudo
    carregarDados();
  });
});
