const SHEET_ID = '1som9-aGql45SsU5LwkT--dhXeiT8S4Vs6w838_DzT7U';
const API_URL = 'https://script.google.com/macros/s/AKfycbxgVfBNQhn7npWuc9m0LlSmC6F08yYGLS0ULLqt4UvnjbBeuKhI39rWn13fleeflCo50g/exec'; // <- atualiza aqui

export async function obterDados() {
  const res = await fetch(`${API_URL}?sheet=Lista`);
  return await res.json();
}

export async function atualizarCelula(linha, coluna, valor) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // ← IMPORTANTE!
    body: JSON.stringify({ linha, coluna, valor })
  });
  return await res.json();
}

