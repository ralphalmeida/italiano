# Formato do conteúdo

Cada unidade é um arquivo `src/data/units/uNN.js` (NN = 01, 02, …) com `export default { ... }`.
Explicações em português do Brasil, conteúdo em italiano. Público: brasileiro, nível A2→B1,
estudando para a prova de cidadania italiana (B1: CILS / CELI / PLIDA). Sem áudio.

```js
export default {
  id: 'u1',                     // único
  title: 'Primi passi',         // em italiano
  subtitle: 'Cumprimentos, essere e avere', // em português
  emoji: '👋',
  lessons: [
    {
      id: 'u1l1',               // único: <unit>l<n>
      title: 'Saluti e presentazioni',
      theory: [                 // explicação didática, 4–8 blocos
        { type: 'p', text: 'Texto em português. Use **negrito** para destacar.' },
        { type: 'table', head: ['Pronome', 'essere'], rows: [['io', 'sono'], ['tu', 'sei']] },
        { type: 'examples', items: [['Io sono Marco.', 'Eu sou Marco.']] },   // [italiano, português]
        { type: 'tip', text: 'Dica ou armadilha comum para brasileiros (falsos amigos etc.).' },
      ],
      vocab: [ ['il cognome', 'o sobrenome'], ... ],   // 8–12 pares [italiano, português]; substantivos COM artigo
      exercises: [              // 8–10, misture os tipos
        { type: 'mc', prompt: 'Como se diz "boa noite" ao chegar num lugar?', options: ['Buonasera', 'Buonanotte', 'Buongiorno', 'Arrivederci'], answer: 0, explain: 'Buonanotte é só ao ir dormir.' },
        { type: 'fill', prompt: 'Io ___ brasiliano.', hint: 'essere', answer: ['sono'], explain: 'io sono' },
        { type: 'order', pt: 'Eu me chamo Ana.', answer: 'Io mi chiamo Ana', extra: ['ti', 'sono'] },
        { type: 'translate', pt: 'Qual é o seu sobrenome? (formal)', answer: ['Qual è il suo cognome?', 'Qual è il Suo cognome?'], explain: 'Formal = Lei/Suo.' },
      ],
    },
  ],
};
```

Regras de exercício:
- `mc`: 4 opções, `answer` = índice da correta. Varie a posição da correta.
- `fill`: exatamente um `___` no prompt. `answer` = lista de respostas aceitas (minúsculas).
- `order`: `answer` é a frase italiana sem pontuação final; as palavras são os blocos (separados por espaço). `extra` = 1–3 palavras distratoras. `alt` (opcional) = outras ordens/formas também corretas.
- `translate`: `answer` = TODAS as traduções naturais aceitáveis (com/sem pronome sujeito etc.). A comparação ignora maiúsculas, pontuação e acentos.
- `explain` sempre curto (1 frase) e em português; obrigatório em mc/fill/translate.
- Conteúdo 100% correto gramaticalmente. Revise cada resposta.
