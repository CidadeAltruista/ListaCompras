const SHEET_ID = '1som9-aGql45SsU5LwkT--dhXeiT8S4Vs6w838_DzT7U';
const API_URL = 'https://script.google.com/macros/s/AKfycby6Bb4Q1qMnpGtXZVb3LxdmmeqbESEZn_PFRqjEDKdnMIkbHG8OI7M6iYy6GflecHrn/exec'; // <- atualiza aqui

export async function obterDados() {
  const res = await fetch(`${API_URL}?sheet=Lista`);
  return await res.json();
}

export async function atualizarCelula(linha, coluna, valor) {
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ linha, coluna, valor }),
    headers: { 'Content-Type': 'application/json' }
  });
  return await res.json();
}
