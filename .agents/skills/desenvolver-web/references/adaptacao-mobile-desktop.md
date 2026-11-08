# Adaptar organização, tela e entradas

## Índice

- Distinguir os contextos
- Reorganizar o conteúdo
- Comportamento em telas pequenas e grandes
- Escolher e verificar mudanças de layout
- Interpretar as referências do usuário

## Distinguir os contextos

Separar quatro informações: dispositivo físico, área lógica disponível, modo de layout e entradas suportadas. Um celular pode solicitar versão desktop e usar toque; um computador pode ter janela estreita e mouse; um tablet pode ter janela ampla, toque e teclado. Não deduzir esses fatores só pelo formato da screenshot ou pelo nome do aparelho.

Não transformar a largura em pixels de uma imagem diretamente em breakpoint CSS ou unidade lógica de um app. Captura, densidade, zoom, barras do sistema e escala podem alterar essa relação. Verificar os dados do ambiente quando disponíveis e registrar incertezas.

## Reorganizar o conteúdo

Preservar identidade, funções, nomes, estado selecionado e trabalho em edição enquanto a apresentação muda. Adaptar a organização ao espaço e à tarefa, em vez de apenas reduzir a escala de uma tela larga.

| Conteúdo/tarefa | Área ampla | Área compacta |
| --- | --- | --- |
| Categorias e configurações detalhadas | Categorias ao lado do painel atual quando útil | Lista de categorias e detalhe por vez, com retorno previsível |
| Destinos principais | Navegação persistente se houver espaço e necessidade | Navegação inferior, lateral temporária ou alternativa adequada ao produto |
| Ações contextuais | Menu próximo do item e atalhos apropriados | Menu/painel alcançável por toque, preservando contexto |
| Busca | Pode compartilhar a tela com outros elementos | Pode ganhar uma tela ou camada própria e acomodar teclado virtual |
| Dados tabulares | Colunas e comparação simultâneas | Prioridades, scroll identificado ou visão alternativa que preserve significado |
| Controles persistentes | Área reservada sem competir com o conteúdo | Reservar espaço e considerar teclado e áreas seguras |

São alternativas a avaliar, não regras universais. Uma navegação inferior não serve a qualquer número de destinos; uma barra lateral não precisa existir em toda tela larga. Uma ferramenta compacta não precisa virar uma coleção de cards gigantes.

## Comportamento em telas pequenas e grandes

Em toque, garantir alvos e espaçamento adequados às diretrizes da plataforma; fornecer acesso às ações sem hover. Em mouse/teclado, manter foco, ordem de navegação e atalhos úteis. Em controle, usar o sistema de foco e ações da engine. Quando houver mais de uma entrada, preservar os caminhos e verificar as transições entre elas.

Manter rótulos legíveis e evitar colisão entre valor, descrição e controle. Planejar rolagem e contenção de menus dentro da área disponível. Considerar altura além de largura: tela deitada com teclado ou barras do navegador pode ter pouco espaço útil.

Ao abrir teclado virtual, permitir alcançar o campo e a ação necessários; ao fechar, preservar entrada e posição apropriadas. Ao redimensionar ou girar, preservar seção, seleção e rascunho conforme o produto. Uma ação fixa ou player persistente não deve cobrir o último item rolável nem ocultar foco.

Não decidir funcionalidades críticas somente por user-agent. Em web, aproveitar layout responsivo e capacidades de entrada quando apropriado; `pointer` e `hover` ajudam a adaptar comportamento, mas não substituem caminhos acessíveis a outras entradas. Em apps nativos, usar os mecanismos de janela e layout do toolkit. Não impor CSS ou breakpoints web a uma engine.

## Escolher e verificar mudanças de layout

Observar onde o conteúdo deixa de caber ou de servir à tarefa. Mudar a estrutura nesse ponto usando convenções da plataforma, sem escolher larguras apenas pelo modelo de um celular famoso. Testar perto da transição, além das amostras compacta/ampla.

Percorrer a mesma tarefa em cada contexto relevante. Verificar navegação e retorno, cortes, rolagem, teclado, foco, ações principais e preservação de dados. Quando não houver dispositivo real ou uma entrada estiver apenas emulada, declarar esse limite. Captura de uma tela larga não comprova experiência em PC, assim como emulação de toque não comprova todo comportamento de um aparelho.

## Interpretar as referências do usuário

Os prints do YouTube com organização desktop foram capturados num celular em modo desktop. Usá-los para estudar categorias, painel de conteúdo e menus; não tratá-los como evidência de uso num computador. Os prints mobile do Spotify mostram outras escolhas, como lista de categorias, navegação inferior e busca numa tela própria.

Como são produtos distintos, separar diferenças de plataforma, de modo de layout e de identidade do produto. Não afirmar que toda diferença visual entre eles decorre de ser mobile ou desktop. Extrair o princípio reutilizável e testar sua adequação ao novo projeto.

Referências: [Android: lista/detalhe adaptável](https://developer.android.com/develop/ui/compose/layouts/adaptive/list-detail), [Android: classes de tamanho de janela](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes), [W3C: capacidades de entrada em Media Queries](https://www.w3.org/TR/mediaqueries-4/), [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/). Conferir a documentação e os critérios específicos da plataforma.
