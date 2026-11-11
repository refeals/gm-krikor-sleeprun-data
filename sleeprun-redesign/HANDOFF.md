# SleepRun — Redesign (handoff para o Claude Code)

Refaça o layout do SleepRun (https://sleeprun.vercel.app/) seguindo as telas em `design/`.
Prioridade: **mobile primeiro**. Mantenha a fonte de dados atual dos jogos; só a interface muda.

## Como ler os arquivos de `design/`

Cada `*.dc.html` é uma tela feita no Claude Design. Eles **não abrem sozinhos no navegador**
(dependem do runtime do editor). Use-os como referência de estrutura, estilos e textos:

- O HTML dentro de `<x-dc>` é o markup da tela; os estilos inline são os valores exatos.
- `{{nome}}` é um valor vindo de `renderVals()` no `<script type="text/x-dc">` no fim do arquivo.
- `<sc-for list="{{x}}" as="item">` = um loop (`.map`); `<sc-if value="{{x}}">` = renderização condicional.
- `onClick="{{fn}}"` / `onInput="{{fn}}"` = handlers definidos em `renderVals()`.
- `<a href="Outra.dc.html">` = navegação entre telas.
- Os dados (oponentes `oponente_exemploN`, precisões, datas) são **de exemplo**. Use os dados reais.

| Arquivo | Tela | Tamanho |
|---|---|---|
| `Main.dc.html` | Lista de jogos (mobile) | 390×844 |
| `Detalhe.dc.html` | Detalhe de um jogo (mobile) | 390×844 |
| `Filtros.dc.html` | Bottom sheet de filtros (mobile) | 390×844 |
| `Carregando.dc.html` | Estado de carregamento (skeleton) | 390×844 |
| `Erro.dc.html` | Estado de erro na fonte de dados | 390×844 |
| `Desktop.dc.html` | Versão desktop (layout fluido, max-width 1200px) | 1440 |

## Tokens

Cores
- Fundo: `#0F1115` · Superfície (cards): `#181B22` · Borda: `#262A33` (sutil: `#22262E`, sheet: `#2E333D`)
- Texto: `#ECEDEF` · Texto secundário: `#C4C9D1` · Rótulos/muted: `#A3A9B4`
- Destaque (botão primário, chip ativo, barra de precisão do Krikor): `#E8C468`, hover `#F3D98F`; texto sobre ele: `#0F1115`
- Vitória: `#6EDB9A` · Derrota: `#FF9B7A` · Empate: `#A9B0BC` (sempre com texto/letra junto, nunca só a cor)
- Banner de vitória no detalhe: fundo `#16241C`, borda `#24432F`

Tipografia (Google Fonts)
- Títulos e números: **Space Grotesk** 600–700
- Texto: **Inter** 400–700
- Título da página 26px (mobile) / 36px (desktop); corpo 15px; meta 12–13px; rótulos em caixa alta 12–13px com `letter-spacing: 0.06em`

Forma e espaçamento
- Raio: cards 14px, inputs/botões 12px, botões grandes 14px, chips 999px, bottom sheet 24px no topo
- Padding lateral mobile 16px; gap entre cards 8px
- **Alvos de toque ≥ 44px** em tudo que é clicável

## Comportamento esperado

- Mobile (< 768px): lista em **cards** (não tabela). Cada card: badge V/E/D 44×44, "vs oponente" + rating,
  abertura (ellipsis), meta "Brancas · Blitz · 42 lances · 9 nov", precisão à direita. Card inteiro clicável → detalhe.
- Busca filtra por oponente ou abertura. Chips Todos/Vitórias/Empates/Derrotas com `aria-pressed`.
- Resumo (Jogos, Vitórias, Derrotas, Precisão média) reflete o filtro atual.
- Botão de filtros abre o bottom sheet (resultado, ritmo, cor, período, abertura) com "Limpar" e "Aplicar filtros".
- Detalhe: banner de resultado, barras de precisão dos dois lados, abertura (+ECO), lances, ritmo;
  ações fixas no rodapé: "Ver partida completa" (link externo) e "Copiar PGN".
- Desktop (≥ 768px): tabela com coluna **Ações** preenchida ("Ver partida", "PGN"), dentro de um container com
  `overflow-x: auto`; cards de resumo em grid `auto-fit, minmax(180px, 1fr)`; paginação acessível.
- Estados: skeleton enquanto carrega; tela de erro com "Tentar de novo" quando a API falhar
  (hoje o site mostra "0 de 0" sem explicação); mensagem própria quando os filtros não retornam nada.
- Rodapé: "Criado por Rafael Siqueira para a comunidade do GM Krikor Mekhitarian." + links (Site oficial, YouTube, GitHub).

## Acessibilidade

- `<button>`, `<a href>`, `<input>` com `<label>` reais; `aria-label` em botões só com ícone.
- Contraste mínimo 4.5:1 no texto (os tokens acima já passam sobre o fundo e as superfícies).
- Ícones: SVG inline com traço (stroke), sem emoji.
