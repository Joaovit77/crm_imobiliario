# CRM Imobiliário — Supabase

## Arquivos
- index.html, style.css, app.js

## Configuração do banco (Supabase SQL Editor)

```sql
create table leads (
  id bigint generated always as identity primary key,
  nome text not null,
  tel text not null,
  email text, cpf text, cidade text,
  tipo_imovel text, finalidade text, valor text,
  bairro text, quartos text,
  status text default 'Quente',
  refs text[], obs text,
  criado_em timestamp with time zone default now()
);

alter table leads enable row level security;
create policy "acesso publico" on leads
  for all using (true) with check (true);
```

## Hospedar (grátis)
- **Netlify**: arraste a pasta em netlify.com
- **Vercel**: `vercel deploy` via CLI
- **GitHub Pages**: suba os arquivos e ative em Settings → Pages
