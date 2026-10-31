# Italiano B1 🇮🇹

App para estudar italiano rumo à prova de cidadania (nível B1 — CILS, CELI ou PLIDA).

- **Trilha** com 11 unidades / 22 lições: teoria em português + exercícios (múltipla escolha, completar, montar frase, traduzir, ligar pares).
- **Gamificação**: XP, níveis, sequência de dias, meta diária, combos, estrelas por lição e conquistas.
- **Revisão espaçada**: o vocabulário de cada lição concluída vira flashcard (sistema Leitner).
- **Leitura**: 8 textos no formato da prova com perguntas de compreensão.
- **Login fixo** (usuários e senhas definidos por variável de ambiente) e **progresso sincronizado** entre aparelhos via Upstash Redis.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha APP_EMAIL, APP_PASSWORD e SESSION_SECRET
npm run dev
```

Sem Redis configurado, em dev o progresso fica na memória do servidor + no navegador.

## Deploy na Vercel

1. Variáveis de ambiente do projeto (Settings → Environment Variables): `APP_EMAIL`, `APP_PASSWORD`, `SESSION_SECRET`
   e, para mais pessoas, `APP_USERS` (`email:senha;email:senha`). Cada usuário tem o próprio progresso.
   Sem elas, o login fica bloqueado em produção.
2. Banco: Storage → **Upstash for Redis** (plano grátis) → conectar ao projeto. Isso cria `KV_REST_API_URL` e `KV_REST_API_TOKEN`.
   Sem o banco, o progresso fica salvo só no navegador.
3. Faça um novo deploy.

## Conteúdo

As lições ficam em `src/data/units/uNN.js` e os textos em `src/data/readings.js`; o formato está em
[`src/data/SCHEMA.md`](src/data/SCHEMA.md). Depois de editar, rode `npm run check-content`.
