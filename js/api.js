const SHEET_ID = '1som9-aGql45SsU5LwkT--dhXeiT8S4Vs6w838_DzT7U';
const API_URL = 'https://script.google.com/macros/s/SEU_DEPLOY_URL/exec'; // <-- vais substituir abaixo

export async function obterDados() {
  const res = await fetch(`${API_URL}?sheet=Lista`);
  return await res.json();
}

export async function atualizarEstado(linha, coluna, novoValor) {
  const res = await fetch(`${API_URL}`, {
    method: 'POST',
    body: JSON.stringify({ linha, coluna, valor: novoValor }),
    headers: { 'Content-Type': 'application/json' }
  });
  return await res.json();
}
