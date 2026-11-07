import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
pool.on('error', error => console.error('Database pool:', error.message));
const allowedOrigins = new Set(['https://cidadealtruista.github.io', 'http://localhost:5174']);

export default {
  async fetch(request) {
    const origin = request.headers.get('origin');
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Vary': 'Origin' };
    if (allowedOrigins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, DELETE, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
    if (origin && !allowedOrigins.has(origin)) return reply({ error: 'Origem não permitida' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    const match = url.pathname.match(/\/(?:api\/)?artigos(?:\/(\d+))?\/?$/);
    if (!match) return reply({ error: 'Não encontrado' }, 404);
    try {
      let result;
      if (request.method === 'GET' && !match[1]) {
        result = await pool.query('SELECT id::integer, categoria, nome, dados FROM artigos ORDER BY categoria, nome');
        return reply(result.rows);
      }
      if (request.method === 'DELETE' && match[1]) {
        result = await pool.query('DELETE FROM artigos WHERE id=$1 RETURNING id', [match[1]]);
      } else if (request.method === 'POST' && !match[1]) {
        const input = await request.json();
        if (typeof input.nome !== 'string' || !input.nome.trim() || input.nome.length > 300 || typeof input.categoria !== 'string' || input.categoria.length > 200 || !input.dados || typeof input.dados !== 'object' || JSON.stringify(input.dados).length > 20000) return reply({ error: 'Dados inválidos' }, 400);
        result = await pool.query('INSERT INTO artigos (nome,categoria,dados) VALUES ($1,$2,$3) RETURNING id::integer,categoria,nome,dados', [input.nome, input.categoria, JSON.stringify(input.dados)]);
      } else if (request.method === 'PATCH' && match[1]) {
        const input = await request.json();
        if (typeof input.valor !== 'string' || input.valor.length > 300) return reply({ error: 'Valor inválido' }, 400);
        if (input.campo === 'nome' || input.campo === 'categoria') {
          result = await pool.query(`UPDATE artigos SET ${input.campo}=$1 WHERE id=$2 RETURNING id::integer,categoria,nome,dados`, [input.valor, match[1]]);
        } else if ((input.campo === 'estado' || input.campo === 'quantidade') && typeof input.alojamento === 'string' && input.alojamento.length <= 100 && (input.campo !== 'estado' || ['', 'F', 'C', 'R'].includes(input.valor)) && (input.campo !== 'quantidade' || /^\d{1,6}$/.test(input.valor))) {
          result = await pool.query("UPDATE artigos SET dados=jsonb_set(dados, ARRAY[$1], coalesce(dados->$1, '{}'::jsonb) || jsonb_build_object($2::text, $3::text), true) WHERE id=$4 RETURNING id::integer,categoria,nome,dados", [input.alojamento, input.campo, input.valor, match[1]]);
        } else return reply({ error: 'Alteração inválida' }, 400);
      } else return reply({ error: 'Método não permitido' }, 405);
      return result.rowCount ? reply(result.rows[0]) : reply({ error: 'Artigo não encontrado' }, 404);
    } catch (error) {
      console.error('Erro na operação:', error.message);
      return reply({ error: 'Não foi possível processar o pedido' }, 500);
    }
  }
};
