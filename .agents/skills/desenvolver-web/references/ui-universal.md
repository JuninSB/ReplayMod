# Interface e conveniência em qualquer plataforma

## Índice

- Observar a tarefa e a plataforma
- Navegação e organização
- Menus, busca e ação contextual
- Configurações e estados
- Sistema visual flexível
- Validação prática

## Observar a tarefa e a plataforma

Aplicar estes princípios a jogos, aplicativos de desktop e celular, interfaces embarcadas e web. Escolher controles e convenções apropriados à plataforma, às ferramentas existentes e ao tipo de entrada. Uma tela nativa ou de engine não precisa ser uma página web.

Antes de desenhar, identificar quem usa, o que precisa fazer, a frequência de cada tarefa, a tela disponível e entradas suportadas: mouse, teclado, toque, controle ou combinações. Verificar o que já existe no projeto, sistema operacional e engine; não substituir um padrão familiar por uma novidade arbitrária.

Das referências enviadas pelo usuário, extrair princípios observáveis: barra lateral com destinos nomeados e histórico; menu contextual agrupando ações do item atual; configurações com grupos, valores visíveis e busca; pesquisa com arquivos recentes e botão de fechar; campo de entrada que continua utilizável com o teclado aberto. São inspirações de organização, não um modelo visual obrigatório. Não incluir screenshots, nomes pessoais, e-mails ou outros dados presentes nas imagens nos projetos gerados.

## Navegação e organização

Separar navegação principal, seções locais e ações do item atual. Dar nomes previsíveis, mostrar onde a pessoa está e manter um caminho de volta. Ordenar por frequência e relação entre tarefas. Não depender apenas de um ícone ambíguo; combinar símbolo, texto ou nome acessível conforme contexto.

Usar o padrão que serve ao volume e à plataforma:

| Padrão | Quando pode ajudar | Cuidado |
| --- | --- | --- |
| Barra lateral | Destinos principais e histórico num espaço suficiente | Colapsar ou trocar por navegação apropriada em tela pequena |
| Abas | Poucas seções relacionadas dentro do mesmo contexto | Não criar dezenas de abas nem esconder estados importantes |
| Categorias ou lista de configurações | Muitos controles agrupados por assunto | Usar nomes concretos e permitir reencontrar opções |
| Menu contextual | Ações sobre o item ou a conversa atual | Disponibilizar acesso por entradas suportadas, sem depender só de hover |
| Busca | Muitos itens ou configurações com nomes localizáveis | Complementar categorias; implementar resultados, vazio, limpeza e fechar |
| Modal ou painel temporário | Tarefa curta que precisa de foco | Fechar e voltar sem perder contexto; preservar rascunho quando necessário |

Não impor esses padrões a toda tela. Uma ferramenta simples pode precisar apenas de uma lista e um botão. Um jogo pode usar navegação direcional sem pesquisa. Um aplicativo pode ter várias seções e uma busca complementar. Planejar a estrutura pelo conteúdo e pela tarefa.

## Menus, busca e ação contextual

Colocar ações perto do objeto afetado; agrupar as relacionadas e separar ações destrutivas visualmente. Permitir fechar um menu e retornar ao foco ou item de origem. Não inserir itens fictícios para preencher espaço.

Se houver pesquisa, definir o que procura, quando atualiza, como abrir resultado e como limpar/fechar. Considerar estado inicial com itens recentes apenas se existem e forem apropriados; resultados inexistentes e falha devem ter mensagens diferentes. Tratar teclado virtual e painel de busca para não cobrir o campo ou os resultados em telas pequenas. Não apresentar pesquisa decorativa.

Rótulos devem explicar o efeito: `Abrir`, `Salvar`, `Excluir conversa`, `Restaurar padrões`. Evitar nomes técnicos internos para ações comuns. Ações irreversíveis pedem confirmação ou recuperação proporcionais ao efeito; não confirmar tudo indistintamente.

## Configurações e estados

Agrupar controles de acordo com o domínio, com valor atual legível, descrição curta quando necessária e ordem previsível. Exemplo para um jogo com opções existentes: **Vídeo**, **Áudio**, **Controles**, **Jogabilidade** e **Acessibilidade**. Para um aplicativo, podem ser **Conta**, **Aparência**, **Notificações**, **Privacidade** e **Acessibilidade**. Adaptar nomes e categorias; não inventar controles.

Cada controle deve estar ligado à configuração real. Definir se aplica imediatamente ou ao pressionar Salvar/Aplicar, se persiste após reinício e o que acontece ao Cancelar, sair ou falhar. Mostrar feedback verdadeiro e manter rascunho quando a operação falha. Para mudança que possa tornar a tela inutilizável, como resolução, considerar prévia com confirmação e reversão segura compatível com a plataforma.

## Sistema visual flexível

Definir papéis reutilizáveis de cor, tipografia, espaçamento, borda, foco, estados e ícones usando os recursos disponíveis na tecnologia do projeto. Escolher personalidade própria e manter consistência, sem converter uma paleta, biblioteca de ícones ou forma de aba em regra universal.

O documento de design registra decisões revisáveis. Aceitar pedidos para redesenhar abas, trocar fontes, cores, tamanho dos controles, ícones ou organização. Atualizar o sistema e o documento; testar comportamento, legibilidade e foco após a mudança.

## Validação prática

Percorrer as tarefas como usuário: entrar e sair da navegação, localizar uma configuração, editar, aplicar, cancelar, fechar e reabrir. Testar entradas e telas suportadas, textos longos, zoom/escala, contraste, foco, falta de dados e falha. Quando só houver simulação ou teste parcial, informar o limite.

Aplicar o ciclo de [inspeção visual](inspecao-visual.md) com as ferramentas autorizadas disponíveis, e escolher os padrões usando [julgamento de UI](julgamento-ui.md). Na [adaptação mobile/desktop](adaptacao-mobile-desktop.md), distinguir hardware, tamanho lógico, layout e entrada. Preservar organização e acesso às funções, sem apenas reduzir a escala de uma tela larga.

Usar documentação primária como ponto de partida: [padrões de configurações Android](https://developer.android.com/design/ui/mobile/guides/patterns/settings), [navegação Android](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns), [configurações Windows](https://learn.microsoft.com/en-us/windows/apps/design/app-settings/guidelines-for-app-settings) e [configurações Apple](https://developer.apple.com/design/human-interface-guidelines/settings). A interpretação e os exemplos acima são decisões de projeto, não regras universais dessas empresas.
