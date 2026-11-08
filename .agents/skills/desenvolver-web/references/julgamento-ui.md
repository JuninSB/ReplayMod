# Decidir uma interface com critério

## Índice

- Começar pela tarefa
- Escolher a organização
- Compor e dar identidade
- Componentes com comportamento
- Usar referências e screenshots
- Revisar por impacto

## Começar pela tarefa

Descrever o que a pessoa quer concluir e a informação que precisa encontrar. Separar o que é frequente, eventual, contextual e destrutivo. Agrupar pelo vocabulário e pelas expectativas do público, não pela estrutura interna do código. Um usuário não deveria precisar conhecer o nome do módulo que implementa uma configuração para localizá-la.

Identificar plataforma, espaço disponível e entradas antes de escolher o layout. Aproveitar convenções familiares sem reduzir toda interface ao mesmo template. Para um pedido simples, registrar essas decisões em poucas linhas e implementar; perguntar só quando uma informação ausente muda materialmente o resultado.

## Escolher a organização

| Situação observada | Padrão a considerar | Critério para escolher |
| --- | --- | --- |
| Muitos destinos principais em janela larga | Barra lateral ou navegação persistente | Permitir trocar de contexto sem perder a localização |
| Poucas perspectivas relacionadas do mesmo objeto | Abas | Cada seção tem conteúdo próprio e seleção clara |
| Muitas configurações agrupáveis | Categorias e lista/detalhe | Reencontrar opções por assunto e preservar caminho de volta |
| Operações sobre um item específico | Menu contextual ou ação próxima | Mostrar o objeto afetado e não ocupar toda a tela com ações ocasionais |
| Comparação de muitos registros por atributos | Tabela ou lista estruturada | Facilitar leitura por coluna, filtro e ação por registro |
| Coleção de objetos visuais ou heterogêneos | Grade ou cards | Imagem ou conteúdo do objeto ajuda a escolher |
| Tarefa curta que precisa de foco temporário | Diálogo ou painel adequado à plataforma | Concluir ou cancelar e voltar ao contexto anterior |
| Grande conjunto localizável por nome | Busca complementar | Produzir resultados úteis, estados claros e acesso direto ao item |

Não usar a tabela como gerador automático de telas. Quantidade, relações, espaço e plataforma podem mudar a escolha. Filtros, abas, destinos e ações possuem funções diferentes; não dar a todos a mesma aparência e comportamento por conveniência.

Em um jogo, categorias como Gráficos, Áudio e Controles ajudam quando contêm opções reais. Num aplicativo simples, duas ou três preferências podem caber numa única página. Categorias não devem existir apenas para preencher abas. Busca não deve ser a única maneira de encontrar opções que poderiam ser organizadas de forma compreensível.

## Compor e dar identidade

Definir a ordem de leitura: contexto/título, conteúdo principal, ação e feedback. Dar mais destaque ao que orienta a tarefa, com ações secundárias e metadados em níveis apropriados. Não transformar cada bloco numa chamada principal.

Resolver primeiro agrupamento, largura de conteúdo, ritmo de espaçamento e alinhamento. Usar proximidade para elementos relacionados e separação maior entre assuntos. Diferenciar título, rótulo, descrição, valor e ajuda por uma escala coerente. Ajustar densidade ao uso: um painel diário e uma página de apresentação podem precisar de ritmos distintos.

Escolher poucas características próprias e sustentá-las: tipografia, tratamento de superfícies, uso da cor, geometria e linguagem das ações. Usar tokens e temas da tecnologia existente para manter consistência e permitir alterações posteriores. Não trocar a família de ícones ou a fonte como substituto de resolver hierarquia e conteúdo.

Cor deve ter papel consistente. Preservar legibilidade e estados em temas existentes, incluindo foco, seleção, erro e desativado. Reservar movimento para feedback e transição compreensível; respeitar preferências de redução de movimento quando suportadas. Gradientes, branco, Inter, Lucide e cantos arredondados continuam escolhas possíveis, avaliadas no contexto.

## Componentes com comportamento

Escolher controle pelo tipo de decisão: seleção única, múltipla, ajuste contínuo, entrada, navegação ou ação. Mostrar valor atual e unidade quando necessária. Um controle deve ser reconhecível como interativo e permitir entradas suportadas pela plataforma.

Tratar estado inicial, seleção/foco, edição pendente, processamento, sucesso, erro e indisponibilidade conforme a operação. Preservar os dados quando há falha e explicar como continuar. Uma tela vazia pode indicar primeiro uso, filtro sem resultado ou falha; cada caso pede conteúdo adequado.

Definir o contrato da interação: o que muda, onde ocorre o efeito real, se aplica imediatamente, se persiste, como cancelar e como voltar. Uma configuração de áudio precisa alcançar o áudio; um botão de download precisa produzir arquivo válido. Um toast não substitui a operação.

Usar componentes mantidos ou nativos em interações complexas, preservando semântica, foco e nome acessível. Customizar a aparência não remove a responsabilidade pelo comportamento.

## Usar referências e screenshots

Separar fato observado, hipótese e decisão. Exemplo: "há categorias à esquerda e conteúdo à direita" é observação; "isso pode acelerar a troca entre categorias em janela larga" é hipótese de uso; "neste app haverá lista/detalhe adaptável" é decisão a verificar.

Observar organização, posição das ações, hierarquia, agrupamentos e feedback. Não inferir funcionalidade, desempenho, acessibilidade completa, CSS, engine ou tamanho lógico só de uma imagem. Não copiar marcas nem dados pessoais. Se a origem ou escala for desconhecida, registrar a incerteza.

Não atribuir significado não mostrado aos dados. Uma lista de recomendações não pode ser chamada de histórico ou itens recentes sem indicação que sustente isso. Da mesma forma, um botão desenhado, um toggle selecionado ou um valor exibido não provam operação, permissão ou persistência. Descrever o fato e marcar hipóteses explicitamente.

As referências do usuário mostram padrões de ChatGPT, YouTube e Spotify, mas não impõem paleta, biblioteca ou layout fixos. A versão desktop do YouTube foi exibida num celular em modo desktop; distinguir modo de layout de hardware e capacidade de entrada.

## Revisar por impacto

Examinar a UI por estas perguntas, usando evidência em vez de uma nota estética arbitrária:

| Critério | Pergunta prática |
| --- | --- |
| Encontrabilidade | A pessoa sabe onde iniciar e consegue reencontrar uma opção? |
| Hierarquia | Tarefa, conteúdo principal e ação se destacam na ordem correta? |
| Clareza | Rótulos, valores, unidades e consequências são compreensíveis? |
| Continuidade | Voltar, fechar, cancelar e navegar preservam contexto e trabalho? |
| Coerência | Controles equivalentes mantêm aparência e comportamento compatíveis? |
| Legibilidade e acesso | Texto, foco, alvos e estados funcionam nas condições suportadas? |
| Realidade do fluxo | A ação chega ao subsistema ou dado verdadeiro e mostra resultado honesto? |
| Adaptação | A organização funciona nos tamanhos e entradas previstos? |

Corrigir primeiro tarefa impossível, ação escondida, sobreposição, corte e perda de estado; depois hierarquia, legibilidade e consistência; por fim acabamento localizado. Não redesenhar tudo porque uma preferência visual pessoal mudou. Conferir as correções seguindo [inspeção visual](inspecao-visual.md).
