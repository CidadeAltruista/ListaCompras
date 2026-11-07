import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = path.dirname(fileURLToPath(import.meta.url));
const connectionString = (await readFile(path.join(root, '.env.neon.local'), 'utf8')).trim();
const pool = new pg.Pool({ connectionString });
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) {
      if (req.headers.origin && req.headers.origin !== 'http://localhost:5174') {
        res.writeHead(403).end(); return;
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 100000) throw new Error('Pedido demasiado grande'); }
      const input = body ? JSON.parse(body) : {};
      let result;
      if (req.method === 'GET' && url.pathname === '/api/artigos') {
        result = await pool.query('SELECT id::integer, categoria, nome, dados FROM artigos ORDER BY categoria, nome');
        res.end(JSON.stringify(result.rows)); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/artigos') {
        result = await pool.query('INSERT INTO artigos (nome, categoria, dados) VALUES ($1,$2,$3) RETURNING id::integer,categoria,nome,dados', [input.nome, input.categoria, JSON.stringify(input.dados)]);
      } else if (req.method === 'DELETE' && /^\/api\/artigos\/\d+$/.test(url.pathname)) {
        result = await pool.query('DELETE FROM artigos WHERE id=$1 RETURNING id', [url.pathname.split('/').pop()]);
      } else if (req.method === 'PATCH' && /^\/api\/artigos\/\d+$/.test(url.pathname)) {
        const id = url.pathname.split('/').pop();
        if (input.campo === 'nome' || input.campo === 'categoria') {
          result = await pool.query(`UPDATE artigos SET ${input.campo}=$1 WHERE id=$2 RETURNING id::integer,categoria,nome,dados`, [input.valor, id]);
        } else if ((input.campo === 'estado' || input.campo === 'quantidade') && typeof input.alojamento === 'string') {
          result = await pool.query("UPDATE artigos SET dados=jsonb_set(dados, ARRAY[$1], coalesce(dados->$1, '{}'::jsonb) || jsonb_build_object($2::text, $3::text), true) WHERE id=$4 RETURNING id::integer,categoria,nome,dados", [input.alojamento, input.campo, String(input.valor), id]);
        } else { res.writeHead(400).end(JSON.stringify({ error: 'Alteração inválida' })); return; }
      } else { res.writeHead(404).end(); return; }
      if (!result.rowCount) { res.writeHead(404).end(JSON.stringify({ error: 'Artigo não encontrado' })); return; }
      res.end(JSON.stringify(result.rows[0])); return;
    }
    if (req.method !== 'GET' || !/^\/(?:|index\.html|js\/[\w.-]+\.js|assets\/[\w.-]+\.png)$/.test(url.pathname)) { res.writeHead(404).end(); return; }
    const file = path.join(root, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch (error) {
    console.error('Erro no servidor local:', error.message);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Erro no servidor local.' }));
  }
}).listen(5174, '127.0.0.1', () => console.log('Lista Neon: http://localhost:5174/'));
