# Revisão do redesign do SleepRun

Revisão feita em 11 nov 2026, antes da implementação, sobre o `HANDOFF.md`, as seis telas em `design/`, o código atual e uma amostra real da API pública do Chess.com (as duas contas, vários meses entre 2021 e 2026).

**Este arquivo complementa o `HANDOFF.md`. Onde os dois discordam, vale este.**

As seções 3 e 8 foram revistas depois da atualização para o Next 16.4.6, com base na documentação que vem no pacote (`node_modules/next/dist/docs/`).

## 1. Decisões

1. O seletor de conta (SleepRun / SpeedBemRuim) vai para o header, no lugar do eyebrow "SLEEPRUN" e do botão de menu. O menu sai.
2. O rating do Krikor aparece no card, no detalhe e num destaque no topo da lista (rating atual, gráfico da subida, placar).
3. Nomes de abertura ficam em inglês, como vêm do Chess.com.
4. Os ajustes visuais da seção 6 entram: neutros puxados para o verde de tabuleiro, rótulos sem caixa alta, caixa só em elemento clicável.
5. O detalhe ganha rota própria, os filtros vão para a URL, e a lista mobile usa "Carregar mais".

## 2. O que a API entrega de verdade

O design foi montado com dados de exemplo que não batem com o conteúdo real. Verificado na API:

- **As contas são speedruns.** O rating começa perto de 400 e sobe até perto de 2500, e os oponentes acompanham. Em nov/2026 a SleepReRun está entre 408 e 543. A amostra do design (oponentes de 2588 a 2731) não representa o site.
- **Existem resets de run.** Em dez/2024 a SpeedBemRuim caiu 2018 pontos depois de uma vitória. Isso marca o início de uma run nova.
- **Cada conta tem um formato só.** SleepReRun: 100% rapid 10+0. SpeedBemRuim: 100% blitz 3+0. Ritmo não diferencia jogo nenhum dentro de uma conta.
- **Precisão é opcional.** `accuracies` só existe em jogos analisados. SpeedBemRuim em nov/2026: 15 de 51 jogos têm precisão.
- **`rating` é o rating depois do jogo.** Conferido: a variação entre dois jogos seguidos acompanha o resultado do segundo jogo. A maior variação legítima vista foi +130 (rating provisório no começo da conta).
- **`eco` é uma URL**, por exemplo `https://www.chess.com/openings/Queens-Gambit-Accepted-Old-Variation`. O código ECO (`D20`) está no header `[ECO "D20"]` do PGN.
- **O FEN muitas vezes vem sem contador de lances.** Em 108 de 144 jogos da amostra o FEN termina em `b - -`, e a coluna "Movimentos" atual mostra `-`. O número de lances tem que sair do PGN.
- **Empate não é tratado hoje.** O código atual mostra 0/0 num empate.
- **`result` diz como o jogo acabou.** Dá para escrever "venceu por xeque-mate", "perdeu no tempo".

### Modelo derivado

Calcular uma vez por conta (memo), a partir de `Game`, e filtrar sobre ele:

```ts
type GameResult = "win" | "draw" | "loss"
type PieceColor = "white" | "black"

// Sem PGN: ele é 70% do volume e só o detalhe precisa dele (seção 8).
type GameView = {
  uuid: string
  url: string
  endedAt: number              // epoch em ms
  year: number                 // ano no fuso de São Paulo, para o filtro
  result: GameResult
  termination: string          // código do Chess.com: checkmated, resigned, timeout, agreed…
  color: PieceColor            // cor do Krikor
  timeClass: string            // rapid, blitz…
  timeControl: string          // "600", "180+2"
  rating: number               // rating do Krikor depois do jogo
  ratingDelta: number | null   // null no primeiro jogo do ritmo e em início de run
  isRunStart: boolean
  opponent: { username: string; rating: number }
  accuracy: { own: number; opponent: number } | null
  openingName: string | null   // do slug de `eco`, em inglês
  ecoCode: string | null       // header [ECO] do PGN
  moveCount: number
}
```

Regras:

- **Lado do Krikor:** `white.username` ou `black.username` igual à conta, sem diferenciar maiúsculas.
- **Resultado:** `win` vira vitória. `agreed`, `repetition`, `stalemate`, `insufficient`, `50move` e `timevsinsufficient` viram empate. O resto (`checkmated`, `resigned`, `timeout`, `abandoned`) vira derrota.
- **`ratingDelta`:** rating deste jogo menos o rating do jogo anterior da mesma conta e do mesmo ritmo, em ordem cronológica. O ritmo importa porque a SleepReRun tem 4 jogos de blitz no meio de 1561 de rápida, e cada ritmo tem seu próprio rating. Se o sinal contradiz o resultado (vitória com delta negativo, derrota com delta positivo) ou se o valor absoluto passa de 300, o jogo é `isRunStart` e `ratingDelta` fica `null`.
- **`openingName`:** tirar o prefixo `https://www.chess.com/openings/`, cortar no primeiro trecho que começa com número de lance (`6.Be3`, `1...d5`) e trocar `-` por espaço. Sem `eco`, `null`. O Chess.com às vezes manda o slug literal `Undefined` (3 jogos na SleepReRun, 5 na SpeedBemRuim), que também vira `null` ("Abertura desconhecida").
- **`moveCount`:** maior número de lance no movetext do PGN.
- **Formato da conta:** constante na configuração de contas (`ACCOUNTS`), já que cada conta tem um formato só: SleepReRun "Rápida 10+0", SpeedBemRuim "Blitz 3+0". Assim o header não depende dos dados e continua de pé nas telas de carregamento e erro.

### Formatação

- Rating sem separador de milhar, como no xadrez: `1531`.
- Precisão com uma casa e vírgula: `93,4%`.
- Contagens com separador: `1.234 partidas`.
- Data: `9 nov` no ano corrente, `9 nov 2024` nos outros anos, sempre no fuso `America/Sao_Paulo` (via `Intl`). As páginas renderizam em servidor UTC, e um jogo às 23h em São Paulo sairia com o dia seguinte. O ano do filtro (`GameView.year`) é calculado no servidor no mesmo fuso.
- Sinal de menos é U+2212 (`−7`), não hífen.

## 3. Rotas e estado

- `/` redireciona para `/sleeprerun`.
- `/[account]` é a lista. `account` aceita `sleeprerun` e `speedbemruim`. Outro valor dá 404 em `requireAccount`, antes de qualquer busca (seção 8).
- `/[account]/jogo/[uuid]` é o detalhe, renderizado no servidor (seção 8, item 6). Se o `uuid` não existir na conta, `notFound()`.
- `app/[account]/layout.tsx` valida a conta. O header da lista (seletor de conta, h1, linha de formato) fica no grupo `app/[account]/(browse)/layout.tsx`, junto com a página da lista, o `loading.tsx` e o `error.tsx`, que assim mantêm o header de pé. O detalhe fica fora do grupo porque tem cabeçalho próprio.
- No Next 16, `params` é uma Promise: `const { account } = await params`.
- Filtros na query string, com as mesmas chaves do código: `q`, `result` (`win|draw|loss`), `color` (`white|black`), `year`, `sort` (`newest|oldest|accuracy`), `page`, `size`. Valor padrão não aparece na URL.
- A URL é a fonte da verdade. O store de filtros do zustand sai. A busca atualiza a URL depois de 300 ms sem digitar. Toda escrita na URL usa `window.history.replaceState`, que o Next sincroniza com `useSearchParams` sem ir ao servidor. `router.replace` buscaria de novo o payload da página, com todos os jogos, a cada filtro.
- `page` e `size` significam o mesmo nos dois layouts: a tabela mostra a página N; a lista mobile mostra tudo até o fim da página N, e "Carregar mais" avança `page`. Um link compartilhado sempre inclui as linhas para as quais apontava. Só o layout ativo é montado (`matchMedia` a partir de 768px), então a lista escondida não cresce com a página do desktop. `page` maior que o total é tratado como a última página.
- A página rola o documento. Nada de altura fixa com scroll interno, como nos frames de 390×844. Assim o Next restaura o scroll ao voltar do detalhe e a barra do iOS funciona.
- Trocar de conta é navegar para `/[account]`, com o mesmo `loading.tsx` de skeleton.

## 4. Telas

### Header (todas as telas)

```
[ SleepRun | SpeedBemRuim ]        segmentado, 44px, raio 999
Jogos do GM Krikor                 h1, 26px mobile / 36px desktop
Rápida 10+0 no Chess.com           13px, muted
```

O seletor é um par de links para `/sleeprerun` e `/speedbemruim`, com `aria-current="page"` no ativo. A linha de formato substitui o "Blitz" que saiu dos cards e aparece em todas as larguras, inclusive no carregamento e no erro. No DOM, o título vem antes do seletor (ordem de leitura); no mobile o seletor aparece em cima via `flex-col-reverse`, no desktop à direita.

**Troca de conta otimista.** O header é um Client Component (`AccountHeader`). No clique, `useOptimistic` dentro de `startTransition` com `router.push`, como a doc do Next 16 recomenda:
- a conta escolhida acende e a linha de formato muda no mesmo frame;
- o header ganha `data-pending`, e o layout troca a lista pelo skeleton só com CSS (`group-has-data-pending:`);
- o leitor de tela ouve "Carregando jogos da SpeedBemRuim…";
- `aria-current` só muda quando a navegação termina.

Clique com modificador (nova aba) segue o link normal. Medido: com `loading.tsx` no segmento, o Next não faz prefetch de nada da outra conta, nem no viewport nem com `router.prefetch` no hover. Os ~850 KB vêm no clique, por isso o estado pendente precisa ser explícito.

### Destaque (topo da lista)

Substitui os quatro blocos de resumo do mobile e do desktop. Sem caixa em volta.

```
543                          pico 2524
rating atual
╱╲╱──╱╱╱    ╱╱╱╱╱──╱●                     sparkline, 64px de altura
+14 =0 −10              precisão 87,2%
                        média de 15 jogos analisados
```

- **Rating atual:** rating do Krikor no jogo mais recente da conta. Ignora filtros. Space Grotesk 700, 44px mobile, 56px desktop.
- **Sparkline:** rating de cada jogo dentro do filtro de ano, em ordem cronológica. Ignora resultado, cor e busca. Reduzir para o último jogo de cada dia. A linha quebra em cada início de run. Traço de 2px na cor de destaque, ponto no último valor, sem eixos. `role="img"` com `aria-label` calculado, por exemplo "Rating de 408 a 543 entre 1 e 11 de nov de 2026".
- **Pico:** maior rating dentro do período do sparkline, 12px muted.
- **Placar:** notação de xadrez, `+V =E −D`, Space Grotesk 20px. O número de vitórias usa a cor de vitória, o de derrotas a de derrota, o de empates a de empate. `aria-label="14 vitórias, 0 empates, 10 derrotas"`. Reflete todos os filtros. Rótulo "placar" abaixo, e o placar nunca quebra linha.
- **Precisão média:** média da precisão do Krikor nos jogos filtrados que têm análise. Abaixo, "precisão média de N jogos analisados". Se nenhum tiver análise: "—" e "nenhum jogo analisado".
- **Hover no sparkline:** linha vertical que segue o ponteiro e encaixa no dia mais próximo, com rating e data num tooltip. Funciona com toque (arrastar na horizontal) sem travar a rolagem vertical. A lista de jogos é a versão em tabela do gráfico, então o tooltip é atalho, não o único acesso ao valor.
- **Desktop:** a partir de 768px, três colunas (`auto 1fr auto`, alinhadas na base, gap 32px): rating com o pico embaixo, sparkline de 96px no meio, placar e precisão empilhados à direita. Testado em 768px: o sparkline fica estreito, mas legível, e a quebra em duas linhas não foi necessária.

### Barra de busca e filtros (mobile)

- Busca por oponente ou abertura, com `<label>` real (pode ser `sr-only`). Fonte de 16px no input, para o iOS não dar zoom.
- Botão de filtros é `<button aria-haspopup="dialog" aria-expanded>`. Com filtros ativos no sheet, mostra a contagem num badge e o `aria-label` vira "Filtros, 2 ativos".
- Chips Todos / Vitórias / Empates / Derrotas com `aria-pressed`, aplicados na hora.
- Linha de contagem: "24 jogos" (ou "1 jogo") à esquerda. À direita, `<select>` de ordenação com rótulo `sr-only` "Ordenar": Mais recentes, Mais antigos, Maior precisão.

### Card da lista (mobile)

```
┌───────────────────────────────────────────┐
│ ┌──┐  ■ vs oponente 1512            1531  │
│ │V │  Queens Gambit Accepted Old…     +8  │
│ └──┘  Precisão 93,4%, 9 nov               │
└───────────────────────────────────────────┘
```

- O card inteiro é um `<a>` para o detalhe.
- **Badge:** 44×44, raio 12, letra V/E/D sobre a cor do resultado. O nome do resultado vai em texto `sr-only` ("Vitória"). `aria-label` num `<span>` não é lido por leitor de tela.
- **Linha 1** (15px, 600): quadrado da peça (10px, `aria-hidden`), "vs {oponente}" com reticências, rating do oponente em 12px muted.
- **Linha 2** (13px, secundário): abertura com reticências.
- **Linha 3** (12px, muted): "Precisão 93,4%, 9 nov". Sem análise, só a data. Jogo em outro ritmo que o da conta (a SleepReRun tem 4 de blitz) começa a linha pelo formato: "Blitz 3+0, precisão 88,1%, 2 mar 2022".
- **Coluna direita:** rating do Krikor (Space Grotesk 17px), e abaixo o delta em 12px 600. "+8" na cor de vitória, "−7" na de derrota, "±0" muted. Em início de run: "nova run", muted.
- Saem do card: "Brancas" (o quadrado da peça já diz), "Blitz" (está no header) e o número de lances (está no detalhe e na tabela).
- Ponteiro: borda passa para `--color-border-strong` em 150 ms. Toque: fundo `--color-surface-pressed`.
- "Carregar mais" no fim da lista, botão secundário de 48px: "Carregar mais 25", ou o que faltar quando sobrarem menos de 25. Some quando acabar.

### Sheet de filtros (mobile)

- `<dialog>` nativo com `showModal()`. Isso dá trava de foco, Esc e fundo inerte. O foco volta para o botão de filtros ao fechar. O título é `<h2>Filtros</h2>`.
- **Grupos:** Cor (Ambas, Brancas, Pretas) e Ano (Todos e os anos presentes nos dados). Saem Resultado (já está nos chips), Ritmo (um formato por conta), Período (substituído por Ano) e o select de aberturas (a busca cobre).
- As escolhas ficam pendentes até o botão principal. Fechar pelo fundo ou pelo Esc descarta.
- **"Limpar"** zera as escolhas pendentes.
- **Botão principal:** "Mostrar 132 jogos", com a contagem ao vivo das escolhas pendentes. Com zero resultados, fica desabilitado com o texto "Nenhum jogo com esses filtros".
- Padding inferior com `env(safe-area-inset-bottom)`.
- Abre deslizando para cima em 240 ms (ease-out) e fecha em 180 ms. Com `prefers-reduced-motion`, sem deslize.

### Detalhe

```
‹ Jogos                                   [compartilhar]
┌───────────────────────────────────────────────────┐
│ (Vitória)                                         │
│ Krikor venceu de brancas por xeque-mate           │
│ em 42 lances                                      │
│ Rápida 10+0, 9 nov 2026                           │
│ Rating 1531 (+8)                                  │
└───────────────────────────────────────────────────┘
Precisão
■ GM Krikor                                   93,4%
██████████████████████████████░░
■ oponente 1512                               81,7%
████████████████████████░░░░░░░░

Abertura   Queens Gambit Accepted Old Variation
           ECO D20
Lances     42
─────────────────────────────────────────────────────
[        Abrir no Chess.com  ↗        ]   primário, 52px
[            Copiar PGN               ]   secundário, 48px
```

- **Banner:** a cor depende do resultado (tokens na seção 6). Pílula com o resultado. O h1 segue o modelo "Krikor {venceu|perdeu|empatou} de {brancas|pretas} {término} em {N} lances".
- **Término**, pelo código do lado que perdeu (ou de qualquer lado, no empate):

  | Código | Texto |
  |---|---|
  | `checkmated` | por xeque-mate |
  | `resigned` | por desistência |
  | `timeout` | no tempo |
  | `abandoned` | por abandono |
  | `agreed` | por acordo |
  | `repetition` | por repetição |
  | `stalemate` | por afogamento |
  | `insufficient` | por material insuficiente |
  | `50move` | pela regra dos 50 lances |
  | `timevsinsufficient` | no tempo, com material insuficiente |

- **Linha de rating** no banner: "Rating 1531 (+8)". Em início de run: "Rating 543, início de run".
- **Precisão:** h2 em sentence case. Duas barras, a do Krikor na cor de destaque. Sem análise, o h2 vira "Jogadores", as linhas dos dois jogadores ficam sem barra e sem porcentagem, e abaixo entra o texto "O Chess.com não tem análise de precisão para este jogo." Assim o nome do oponente aparece nos dois casos.
- **"Jogos" (voltar):** se o leitor veio da lista, volta no histórico, o que restaura filtros e scroll. A lista grava o `uuid` aberto em `sessionStorage`. Aberto por link compartilhado, o mesmo link leva para `/[account]`.
- **Abertura e lances:** um `<dl>` sem caixas, separado por linhas finas. Sai o bloco Ritmo, que já está no banner.
- **Rodapé fixo** com `env(safe-area-inset-bottom)`.
  - "Abrir no Chess.com" abre em nova aba. Leva um ícone SVG de link externo e o texto `sr-only` "(abre em nova aba)".
  - "Copiar PGN" troca o rótulo para "PGN copiado" por 2 s e anuncia numa região `aria-live="polite"`.
- **Compartilhar:** usa `navigator.share({ url })` quando existe. Senão copia o link e mostra "Link copiado" do mesmo jeito.

### Desktop (≥ 768px)

```
Jogos do GM Krikor                          [ SleepRun | SpeedBemRuim ]
1.565 partidas na conta SleepReRun do Chess.com, desde abril de 2021.

[ destaque: rating | sparkline | placar e precisão ]

[ busca......................... ] (Todos)(Vitórias)(Empates)(Derrotas) [Cor] [Ano] [Ordenar]

┌ tabela, overflow-x: auto, min-width 900px ────────────────────────────────────────┐
│ Resultado  Oponente      Abertura         Rating   Precisão  Lances  Data   Ações │
│ (Vitória)  ■ oponente 1512  Queens Gambit…  1531 +8   93,4%     42   9 nov  [↗ Chess.com] [PGN] │
└───────────────────────────────────────────────────────────────────────────────────┘
Mostrando 1–25 de 1.234          Linhas por página [25]       ‹ 1 2 3 … 50 ›
```

- **Container:** max-width 1200px, padding 32px 24px 48px.
- **Ordenar:** fica na linha da contagem, como no mobile, e não na barra de filtros.
- **Largura da tabela:** cabe inteira a partir de 1280px. Abaixo disso rola dentro do próprio container, e a página nunca rola na horizontal. Abertura e oponente truncam com `title`. O container é `relative` para os textos `sr-only` das células não escaparem dele.
- **Header:** os botões "Site oficial" e "YouTube" do header saem. Esses links ficam no rodapé, e o lugar deles fica com o seletor de conta.
- **Cabeçalhos da tabela:** sentence case, 13px, 600, muted. Colunas numéricas alinhadas à direita, com `tabular-nums`.
- **Link para o detalhe:** o nome do oponente. A linha inteira muda de fundo no hover.
- **Ações**, os dois botões ghost com 44px de altura:
  - "Chess.com", com ícone de link externo e `aria-label="Abrir partida contra {oponente} no Chess.com"`.
  - "PGN", com `aria-label="Copiar PGN da partida contra {oponente}"`. O retorno "PGN copiado" sai numa região `aria-live` única da página.
- **Cor de destaque:** não aparece em botão de linha da tabela. Vinte e cinco botões dourados competem entre si.
- **Paginação:** fica a numerada que já existe, com o seletor de linhas por página.

### Carregando

- `app/[account]/(browse)/loading.tsx`. O mesmo skeleton é o fallback do `<Suspense>` da lista, então é também o que vai no HTML antes da hidratação e o que se vê sem JavaScript.
- O detalhe tem `loading.tsx` próprio, porque a página é gerada na primeira visita e pode demorar.
- **Texto real, sem skeleton:** o header (seletor e h1). O seletor funciona durante o carregamento.
- **Skeleton:** blocos do destaque (retângulo de 44px para o rating e de 64px para o sparkline), busca, chips e seis cards.
- `aria-busy="true"` na região da lista e `<p role="status">Carregando jogos…</p>`.
- Sem shimmer. Um pulse lento é aceitável, desligado com `prefers-reduced-motion`.

### Erro

- **Quando aparece:** a camada de dados lança erro e ele cai em `app/[account]/(browse)/error.tsx` (Client Component). O detalhe tem o seu, com h1 próprio.
- **Limitação aceita:** toda falha mostra esta mensagem, até um bug de código. Em produção o texto do erro não chega ao navegador. Separar os casos exigiria renderizar a falha na própria página, e o ISR guardaria essa tela por 5 min. Lançando o erro, o ISR continua servindo a última versão boa quando a revalidação falha.
- **Foco:** antes do `retry()`, o foco vai para o `<main>`, já que o botão some se der certo.
- **"Tentar de novo"** chama `retry()`, que no Next 16 busca de novo e re-renderiza o segmento. `reset()` só re-renderiza sem buscar, então não serve aqui. `retry()` não devolve Promise, então não existe estado "Tentando…" confiável: o botão só chama `retry()`.
- **Header completo**, vindo do layout, com o seletor, para dar para tentar a outra conta.
- **Bloco `role="alert"`:**
  - ícone
  - h2 "O Chess.com não respondeu"
  - texto "A lista de jogos vem da API pública do Chess.com. Tente de novo em alguns minutos."
  - botão primário "Tentar de novo"
  - link secundário "Ver jogos no Chess.com", para `https://www.chess.com/games/archive/{account}`
- O rodapé é o mesmo das outras telas.

### Vazio

- **Filtros sem resultado:** "Nenhum jogo com esses filtros." e um botão secundário "Limpar filtros", que limpa busca, resultado, cor e ano. Ordenação e tamanho de página ficam, porque não são filtros.
- **Conta sem partidas** (a API respondeu com lista vazia): "Essa conta ainda não tem partidas no Chess.com."
- **Telas de status:** 404 e erros usam o mesmo componente (`StatusScreen`): ícone, título, uma frase e as saídas.
- **Endereço inexistente** (`app/not-found.tsx`): "Página não encontrada", "Esse endereço não leva a uma conta nem a uma partida." e um botão por conta ("Ver jogos da SleepRun", "Ver jogos da SpeedBemRuim").
- **Partida inexistente** (`app/[account]/jogo/[uuid]/not-found.tsx`): "Partida não encontrada", "Não há partida com esse endereço na conta SleepReRun." e "Ver jogos da SleepRun".
- **Erro fora da lista e do detalhe** (`app/error.tsx`, por exemplo num layout de conta): "Não foi possível abrir esta página", "Tente de novo. Se o erro continuar, comece pela lista de jogos.", com "Tentar de novo" e "Ver jogos do GM Krikor". O rodapé fica.
- **Erro no layout raiz** (`app/global-error.tsx`): a mesma tela, com documento, estilos e fontes próprios (`app/fonts.ts` é compartilhado com o layout raiz) e `<title>Erro | SleepRun</title>`.
- As cinco telas foram testadas no navegador. Os erros foram forçados com um `throw` temporário, já revertido.

### Rodapé (todas as telas)

"Criado por [Rafael Siqueira](https://rafaelsiqueira.dev/) para a comunidade do GM Krikor Mekhitarian."

Links separados por espaço, sem ponto médio, cada um com área de toque de 44px:
- Site oficial: https://gmkrikor.com.br/
- YouTube: https://www.youtube.com/@GMKrikor
- GitHub: https://github.com/refeals/gm-krikor-sleeprun-data

## 5. Acessibilidade e interação

Contraste calculado para todos os pares abaixo. O menor texto é o placeholder, com 5,35:1 sobre a superfície.

- `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }` em tudo que é focável. O label da busca usa `:focus-within` com o mesmo anel, porque o input tem `outline: none`.
- Alvos de toque de 44px no mínimo, inclusive os botões da tabela desktop (o design tinha 36px).
- Nenhum texto abaixo de 12px. O design tinha 11px nos rótulos do resumo e no "precisão" do card.
- `color-scheme: dark`. Exportar `viewport` com `viewport-fit=cover` e `themeColor: #0E1411`.
- Resultado nunca só por cor: letra no badge, palavra na pílula, sinal no delta.
- Movimento só em resposta a ação: sheet, retorno de cópia, toque em chip (120 ms). Sem animação de entrada. `prefers-reduced-motion` respeitado.
- Ícones SVG com traço (lucide-react já está instalado), `aria-hidden` quando há texto ao lado e `aria-label` no botão quando o ícone está sozinho.
- Link "Pular para o conteúdo" como primeiro foco da página, levando a `#main-content`.
- Link dentro de frase ("Rafael Siqueira" no rodapé) fica sublinhado: só a cor não basta (WCAG 1.4.1).
- Auditoria com axe-core em 390px e 1440px (lista, sheet aberto, detalhe): zero violações.

## 6. Tokens revisados

### Cores

Os neutros foram puxados para o verde de tabuleiro, que continua a identidade do site atual (`bg-green-950`). O destaque dourado e as cores de resultado ficam.

| Custom property | Valor | Uso |
|---|---|---|
| `--color-bg` | `#0E1411` | fundo da página |
| `--color-surface` | `#161D19` | cards, inputs, sheet |
| `--color-surface-pressed` | `#1A221D` | card pressionado, linha da tabela em hover |
| `--color-border` | `#25302A` | borda de card e input, trilho das barras |
| `--color-border-subtle` | `#1F2823` | divisórias da tabela e do `<dl>` |
| `--color-border-strong` | `#2E3A33` | hover de card, borda do sheet |
| `--color-text` | `#ECEEEC` | texto principal |
| `--color-text-secondary` | `#C3CAC5` | abertura, texto de apoio |
| `--color-text-muted` | `#A1AAA4` | meta, rótulos |
| `--color-placeholder` | `#89928C` | placeholder |
| `--color-disabled` | `#6E7871` | texto desabilitado, borda do quadrado da peça |
| `--color-accent` | `#E8C468` | botão primário, chip ativo, barra e sparkline do Krikor, foco |
| `--color-accent-hover` | `#F3D98F` | hover do destaque |
| `--color-on-accent` | `#0E1411` | texto sobre destaque e sobre cores de resultado |
| `--color-win` | `#6EDB9A` | vitória |
| `--color-loss` | `#FF9B7A` | derrota |
| `--color-draw` | `#AEB5B0` | empate |
| `--color-opponent-bar` | `#7D8880` | barra de precisão do oponente |
| `--color-banner-win-bg` / `-border` | `#15291D` / `#2A5238` | banner de vitória |
| `--color-banner-loss-bg` / `-border` | `#2A1A16` / `#5A3328` | banner de derrota |
| `--color-banner-draw-bg` / `-border` | `#161D19` / `#2E3A33` | banner de empate |
| `--color-piece-white` | `#F5F5F4` | quadrado de peça branca |

Contraste medido (WCAG): texto 14,71:1 na superfície, secundário 10,27:1, muted 7,19:1, placeholder 5,35:1, vitória 10,02:1, derrota 8,35:1, empate 8,20:1, texto escuro sobre destaque 11,12:1. Não-texto: barra do oponente 3,72:1 sobre o trilho, borda do quadrado da peça 3,75:1 sobre a superfície.

Nenhuma cor fora desta tabela. As cores soltas do design (`#B4BAC4`, `#7C8494`, `#3A404B`, `#20242C`, `#222630`, `#07080A`) foram absorvidas por estes tokens. Os tokens do shadcn que sobrarem sem uso saem do `globals.css` e do `tailwind.config.ts`.

### Tipografia

- Space Grotesk 600–700 em títulos e números. Inter 400–700 no texto. As duas via `next/font/google`, no lugar da Roboto.
- `font-variant-numeric: tabular-nums` em todo número (rating, delta, precisão, contagens, placar, datas na tabela).
- Escala:
  - h1: 26px no mobile, 36px no desktop
  - rating do destaque: 44px / 56px
  - placar: 20px
  - corpo: 15px
  - meta: 12–13px
- Rótulos em sentence case, 13px, peso 600, cor muted. Nada de caixa alta com letter-spacing.

### Forma e espaçamento

- Raios: 999px em chips, pílulas e seletor de conta; 14px em cards, botões grandes e banner; 12px em inputs, botões e badge; 24px no topo do sheet. Nenhum outro valor (o design tinha 10, 16, 18 e 20).
- Caixa com borda só em elemento clicável (card da lista, input, botão). Destaque, seção de precisão e dados do detalhe ficam sem caixa. O banner de resultado é a exceção, porque a cor dele é o resultado.
- Gutter mobile de 16px, gap de 8px entre cards, 16–24px entre seções.

## 7. Textos

Vocabulário único: a ação que se chama "Copiar PGN" confirma com "PGN copiado"; o botão "Limpar filtros" faz o mesmo que "Limpar" no sheet.

| Lugar | Texto |
|---|---|
| Título da aba | Jogos do GM Krikor no SleepRun |
| h1 | Jogos do GM Krikor |
| Formato | Rápida 10+0 no Chess.com / Blitz 3+0 no Chess.com |
| Subtítulo desktop | {N} partidas na conta {usuário} do Chess.com, desde {mês} de {ano}. (O formato fica na linha do header; o total inclui jogos de outros ritmos.) |
| Destaque | rating atual · pico {N} · precisão média · média de {N} jogos analisados · nenhum jogo analisado |
| Busca (label) | Buscar por oponente ou abertura |
| Busca (placeholder) | Oponente ou abertura |
| Chips | Todos · Vitórias · Empates · Derrotas |
| Contagem | 1 jogo / {N} jogos |
| Ordenar | Mais recentes · Mais antigos · Maior precisão |
| Botão de filtros | Filtros / Filtros, {N} ativos |
| Sheet | Filtros · Limpar · Cor · Ambas · Brancas · Pretas · Ano · Todos · Mostrar {N} jogos |
| Card | vs {oponente} · Precisão {N}% · nova run |
| Lista | Carregar mais 25 |
| Detalhe | Jogos · Compartilhar · Precisão · Abertura · Lances · Abrir no Chess.com · Copiar PGN |
| Retornos | PGN copiado · Link copiado · na tabela: PGN, Copiado, Erro (leitor de tela: "PGN copiado", "Não foi possível copiar o PGN") |
| Navegação | Pular para o conteúdo · Página não encontrada · Esse endereço não leva a uma conta nem a uma partida. · Ver jogos da SleepRun · Ver jogos da SpeedBemRuim |
| 404 de partida | Partida não encontrada · Não há partida com esse endereço na conta {usuário}. |
| Erro de página | Não foi possível abrir esta página · Tente de novo. Se o erro continuar, comece pela lista de jogos. · Tentar de novo · Ver jogos do GM Krikor |
| Troca de conta | Carregando jogos da {conta}… (leitor de tela) |
| Sem análise | O Chess.com não tem análise de precisão para este jogo. |
| Carregando | Carregando jogos… |
| Erro | O Chess.com não respondeu · A lista de jogos vem da API pública do Chess.com. Tente de novo em alguns minutos. · Tentar de novo · Ver jogos no Chess.com |
| Vazio | Nenhum jogo com esses filtros. · Limpar filtros · Essa conta ainda não tem partidas no Chess.com. |

Os pontos médios desta tabela só separam itens da tabela. Na interface, cada texto é um elemento separado.

## 8. Camada de dados (Next 16)

O `HANDOFF.md` diz que só a interface muda. Sem os itens abaixo, as telas de erro, de carregamento e de detalhe não funcionam.

Medido com os dados reais em nov/2026: cada conta tem entre 1,5 mil e 1,8 mil jogos e cerca de 5 MB de JSON, dos quais 70% são PGN. Hoje o cliente recebe tudo pela Server Action, cerca de 1,1 MB com gzip. A lista no formato `GameView`, sem PGN, fica entre 650 e 700 KB, ou cerca de 105 KB com gzip.

### Estado atual

- `/` sai como estática (○) no build. Os jogos que vão no HTML são os do momento do build. A página só parece atualizada porque o cliente busca tudo de novo pela Server Action.
- O prefetch do servidor usa a chave `["games"]` e o hook lê `["games", account]`, então o prefetch é descartado.
- `getGames` captura qualquer erro e devolve `[]`. A tela de erro nunca apareceria.
- Cada carregamento busca todos os meses de novo (67 na SleepReRun), sem cache.

### Arquitetura nova

1. **A busca sai da Server Action.** Pela doc do 16, Server Functions servem para mutação e o cliente despacha uma de cada vez; busca de dados fica em Server Component. `fetchers/getGames.ts` vira um módulo só de servidor (`import "server-only"`), chamado pelas páginas.
2. **Erros sobem.** Checar `res.ok` na lista de arquivos e em cada mês e lançar erro no lugar do `return []`. Quem mostra a tela de erro é o `error.tsx`.
3. **Cache por mês no `fetch`:**
   - lista de arquivos: `next: { revalidate: 300 }`, para um mês novo aparecer logo na virada
   - mês corrente: `next: { revalidate: 300 }`
   - meses passados: `next: { revalidate: 86400 }`

   Meses passados revalidam uma vez por dia em vez de usar `force-cache`. O Next julga a validade de uma entrada pelo `revalidate` da chamada que lê, não da que gravou. Por isso, no dia 1 do mês, o mês anterior continua com 300 s: ele pode ter sido gravado horas antes de fechar e ficaria até um dia sem os jogos finais.

   A escolha pelo cache do `fetch` vem da doc de `use cache` ("Runtime caching considerations"). Em serverless, o handler padrão do `use cache` fica em memória e normalmente não guarda entradas entre requests. O cache do `fetch` persiste entre requests e entre deploys.

   O Chess.com limita requisições em paralelo, então as buscas rodam no máximo 6 por vez, com até 3 tentativas em resposta 429, 5xx, erro de rede ou timeout (15 s). Cada tentativa leva um `signal` próprio. Sem ele, a deduplicação de `fetch` do Next devolveria a mesma resposta de erro nas tentativas seguintes. Depois de uma falha, nenhuma busca nova começa.
4. **Lista estática com ISR**, em `app/[account]/(browse)/page.tsx`:
   - `generateStaticParams` devolve `[]`: nenhuma conta é gerada no build, cada uma é gerada na primeira visita e guardada. Assim o deploy não depende do Chess.com estar no ar; um build que buscasse os jogos falharia junto com a API. Os meses continuam no cache do `fetch`, que sobrevive a deploys: a primeira visita medida levou 1,4 s, e as seguintes 20 ms. Conta desconhecida dá 404 em `requireAccount`, antes de qualquer busca.
   - `export const revalidate = 300`.
   - A página monta o `GameView[]` no servidor e passa para o componente cliente da lista como prop.
   - Os filtros são lidos no cliente com `useSearchParams`, dentro de um `<Suspense>`, para a página continuar estática. Ler `searchParams` na página tornaria a rota dinâmica.
5. **React Query, zustand e react-table saem.** Os dados chegam como prop do Server Component e os filtros vivem na URL, então nenhum dos três tem mais função. O problema da chave de query divergente some junto. A tabela desktop é simples e a paginação já é própria.
6. **Detalhe** em `app/[account]/jogo/[uuid]/page.tsx`:
   - acha o jogo na lista (em cache)
   - usa o `endedAt` para saber o mês
   - busca o mês (também em cache) para ter o PGN

   `generateStaticParams` devolve `[]`, então cada página é gerada na primeira visita e guardada. Jogo terminado não muda, mas `revalidate = false` não adiantaria: a página lê o mês corrente (300 s), e um `fetch` com revalidate menor rebaixa a rota inteira. Fica `revalidate = 300` explícito. Um `uuid` fora do formato UUID dá 404 antes de qualquer busca.

   Os cards da lista usam `prefetch={false}`. A rota de detalhe é estática, e o prefetch padrão faria o servidor gerar uma página de detalhe por card visível.
7. **PGN sob demanda para a tabela desktop.**
   - **Route Handler:** `GET /api/games/[account]/[uuid]/pgn?month=2026-11`, respondendo `text/plain`. Com o mês, lê só aquele arquivo; sem ele, ou se o jogo não estiver lá, o histórico inteiro. Falha do Chess.com vira 502 em texto. Cache: `max-age=86400, s-maxage=2592000` (o CDN da Vercel só guarda com `s-maxage`).
   - **Rótulos:** "PGN", "Copiado" ou "Erro" visíveis, com complemento `sr-only` ("Copiar PGN da partida contra X"). O nome acessível sempre contém a palavra visível (WCAG 2.5.3). Dois cliques em linhas diferentes que terminam fora de ordem: só a última requisição atualiza o estado.
   - **Cópia:** o botão "PGN" chama `navigator.clipboard.write([new ClipboardItem({ "text/plain": fetchPromise })])`. Passar a Promise para o `ClipboardItem` mantém o gesto do usuário válido no Safari durante o fetch.
   - **Fallback:** sem `ClipboardItem`, busca primeiro e depois usa `writeText`.
   - **No detalhe:** o PGN já está na página, então a cópia usa `writeText` direto.
8. **Cache Components fica desligado.** O checklist de upgrade do 16 pede para não ligar só por causa do upgrade. Aqui a página é estática com filtro no cliente, e o ganho dele (shell estático com partes por request em streaming) não aparece. Vale reavaliar se surgir conteúdo por request.
9. **Número de lances pelo PGN**, porque o FEN costuma vir sem contador (seção 2).
10. **Cache do roteador no cliente.** As páginas de conta são geradas sob demanda, então o Next as trata como dinâmicas no cache do navegador, e o padrão para dinâmicas é não guardar nada. Cada troca de conta baixava a lista inteira de novo (~850 KB descomprimidos, ~105 KB com gzip), mesmo voltando para uma conta vista segundos antes. `experimental.staleTimes.dynamic = 300` no `next.config.ts` guarda as páginas visitadas por 5 min. Medido: voltar para a outra conta passou de 760 KB e 445 ms para nenhuma requisição e 119 ms. Isso cobre o que o React Query fazia (cache em memória por conta durante a sessão), sem um segundo caminho de dados. A flag é marcada como experimental na doc. No pior caso, uma conta vinda do cache tem ~10 min (5 do ISR e 5 no navegador).

O que já não usava rede: filtros, busca, ordenação e paginação (`replaceState` sobre os dados em memória), voltar e avançar no navegador, e o link "Jogos" do detalhe.

## 9. Rodada de UX antes do deploy (ui-ux-pro-max)

Auditoria contra as regras de referência, medida em Chrome headless:

| Regra | Problema | Solução |
|---|---|---|
| Alvo previsível | Na tabela, só o nome do oponente abria a partida | A linha inteira abre. Ctrl/Cmd/Shift e clique do meio abrem em nova aba. Cliques em links, botões e seleção de texto são ignorados. O nome continua sendo o link real, para teclado e leitor de tela, lido como "Ver partida contra X". |
| `tap-feedback-speed` (100 ms) | Com rede lenta, tocar num card ficava mais de 900 ms sem nenhum sinal | Barra de progresso no fim do card e spinner na tabela via `useLinkStatus` (os links de partida não fazem prefetch). Medido: aparece em 100 ms. |
| `focus-on-route-change` | Ao chegar no detalhe, o foco ficava no `body` | O detalhe move o foco para o `<main>` ao montar |
| `modal-escape` | O sheet não tinha botão de fechar, e a alça sugeria arrastar sem arrastar | Botão "Fechar filtros" e arrastar para baixo pela alça ou pelo título: mais de 80 px fecha, menos volta |
| `touch-spacing` (8 px) | Paginação com 4 px entre botões | 8 px |
| Título por página | As duas contas tinham o mesmo título, e o detalhe dizia "SleepRun" também na SpeedBemRuim | "SleepRun \| Jogos do GM Krikor", "SpeedBemRuim \| Jogos do GM Krikor", e o detalhe usa a conta certa. É também o que o anunciador de rotas lê. |
| `press-feedback` | Chips e botões não reagiam ao toque | Estado `active` em chips, botões, paginação e seletor de conta |
| `loading-buttons` | "PGN" da tabela não indicava a busca em andamento | Desabilitado com `aria-busy` enquanto copia |

Mantidos: os chips em 375 px rolam na horizontal, e o último cortado indica a rolagem; o corpo de 15 px vem do HANDOFF.

## 10. Ordem sugerida

1. Camada de dados: itens da seção 8 e o `GameView`.
2. Tokens, fontes e limpeza do shadcn.
3. Rotas e estado na URL.
4. Lista mobile: header, busca, chips, cards, "Carregar mais".
5. Destaque com sparkline.
6. Sheet de filtros.
7. Detalhe.
8. Desktop.
9. Carregando, erro e vazio.
10. Passada de acessibilidade: teclado, leitor de tela, 390px e 1440px.
