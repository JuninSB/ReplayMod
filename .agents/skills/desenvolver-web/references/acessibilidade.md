# Acessibilidade aplicada

## Índice

- Base
- Teclado e foco
- Formulários e estados
- Tabs e componentes
- Verificação

## Base

Usar [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/) como referência e verificar os critérios aplicáveis. Pretender AA não equivale a certificar conformidade. Testes automáticos cobrem parte dos problemas; incluir avaliação manual.

Usar semântica nativa, landmarks, título de página, idioma correto e hierarquia de headings. Não escolher tags pelo tamanho visual. Dar texto alternativo conforme função; imagem decorativa pode ter alt vazio. Fornecer nome acessível para ícones interativos; ícones decorativos junto de texto devem evitar anúncio duplicado.

Verificar contraste: texto comum 4,5:1; texto grande conforme definição WCAG 3:1; componentes e informação gráfica relevantes 3:1 onde o critério se aplica. Não usar só cor para transmitir estado. Conferir também tema escuro, hover e foco.

Considerar alvos de toque, espaçamento e exceções dos critérios aplicáveis. Como direção de conforto, usar controles maiores quando possível; não declarar que um tamanho fixo sozinho garante conformidade. Preservar zoom, reflow e leitura em tela estreita. Não desativar zoom da viewport.

## Teclado e foco

Percorrer com Tab e Shift+Tab em ordem lógica; usar Enter e Space nos controles adequados. Não remover outline sem substituto visível. Não usar tabindex positivo para remendar ordem ruim. Garantir que sticky headers, banners e overlays não escondam o foco.

Em modal, manter foco no conteúdo modal, definir destino inicial e devolver ao controle de origem ao fechar. Evitar armadilha de teclado fora do modal. Quando a origem desapareceu, escolher destino lógico. Escape deve respeitar contexto e dados não salvos.

Menus, comboboxes, árvore e seleção têm padrões específicos. Usar primitiva acessível mantida quando possível e testar customizações. Um kit não torna a integração automaticamente acessível.

## Formulários e estados

Associar label e campo, instrução e erro com relações programáticas. Informar requisitos antes do erro. Preservar valores e permitir correção. Para grupos, usar fieldset/legend quando apropriado. Não usar placeholder como único rótulo.

Anunciar mudanças assíncronas relevantes com live regions proporcionais. Evitar anunciar todo keystroke ou mover foco para cada toast. Mostrar erro de forma persistente quando a pessoa precisa agir. Não depender de desaparecimento rápido para comunicar resultado.

Respeitar `prefers-reduced-motion`. Evitar movimento contínuo gratuito e oferecer controle quando aplicável. Skeletons devem evitar ruído para leitores de tela e corresponder à estrutura carregada. Não criar espera artificial para exibi-los.

## Tabs e componentes

Nas [tabs APG](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), relacionar tablist, tab e tabpanel; controlar seleção, foco e associação. Implementar navegação por setas apropriada à orientação e ativação automática apenas quando o painel aparece sem latência perceptível. Para ativação manual, usar Enter/Space. Conferir detalhes da versão atual do padrão.

Para navegação entre páginas, preferir links e `aria-current`. Para tabelas, manter cabeçalhos e relações; não aplicar `role=grid` a uma tabela comum sem implementar o comportamento de grid. Para botões toggle, comunicar estado com mecanismo apropriado.

## Verificação

Testar teclado, foco, zoom, reflow, redução de movimento, erros e rótulos. Usar auditoria automatizada e, conforme o escopo, leitor de tela e pessoas usuárias. Registrar o que foi e não foi coberto. Corrigir a causa sem simplesmente silenciar ferramenta.

Consultar também [Primer accessibility](https://primer.style/accessibility/) e [React Aria](https://react-aria.adobe.com/) como recursos de implementação. Manter a responsabilidade do produto além da biblioteca escolhida.
