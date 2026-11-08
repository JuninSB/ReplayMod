# Frontend funcional

## Índice

- Semântica e estrutura
- Estado e dados
- Controles e navegação
- Formulários e arquivos
- Responsividade e assets
- Verificação

## Semântica e estrutura

Usar HTML pelo significado: link para navegar, botão para executar, form para submeter, table para dados tabulares e heading para hierarquia. Um `div` com clique não substitui botão. Definir `type` em botões dentro de formulários. Manter landmarks, título de página e ordem de leitura.

Organizar por funcionalidades e componentes coerentes. Não colocar toda a aplicação em um componente nem extrair qualquer linha para um arquivo. Manter primitivas de interface consistentes e regras de negócio longe de componentes puramente visuais.

Respeitar limites de renderização da stack. Em SSR, não acessar `window` ao importar módulo; evitar divergência de hidratação com datas, aleatoriedade e preferências. Colocar código cliente apenas onde há interatividade. Não tornar a árvore inteira cliente para corrigir um detalhe isolado.

## Estado e dados

| Estado | Lugar típico | Cuidados |
| --- | --- | --- |
| Filtros, busca, página e seção compartilhável | URL | Validar e permitir voltar/reabrir |
| Modal, seleção temporária, campo em edição | Estado local | Limpar no momento correto e evitar perda de trabalho |
| Dados remotos | Loader/cache da stack | Escopo por usuário, invalidação e concorrência |
| Regras e dados compartilhados duráveis | Servidor/banco | Validação, permissão e transação |
| Preferência local | Storage/cookie adequado | Limites, sincronização e dados não sensíveis |

Preferir mecanismo do framework antes de adicionar outra biblioteca de dados. Quando cache de servidor no cliente for necessário, usar uma solução apropriada e definir chaves, invalidação e atualização. Não duplicar três fontes de verdade para o mesmo registro.

Tratar respostas fora de ordem: cancelar requisição anterior ou ignorar resultado obsoleto. Considerar `AbortController`, desmontagem e troca de filtro. Não exibir erro de cancelamento como falha do usuário. Separar recarregamento de dados já disponíveis do primeiro carregamento.

Usar atualização otimista somente com rollback e reconciliação. Pagamento, permissão e operação irreversível exigem confirmação real. Não assumir sucesso do servidor para liberar funcionalidade sensível.

## Controles e navegação

Cada controle deve possuir resultado observável. Um toast de sucesso não é a operação. Busca precisa filtrar/consultar; ordenar precisa mudar a ordem; exportar precisa gerar arquivo; paginação precisa trocar o conjunto; tema precisa alterar e preservar preferência conforme escopo.

Usar tabs para painéis relacionados no mesmo contexto, e links para destinos navegáveis. Para tabs reais, implementar semântica, foco e teclado do [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). Se uma seção merece URL e histórico, usar navegação ou sincronizar explicitamente a rota. Não usar `role=tab` em links de um menu sem o comportamento correspondente.

Em diálogos, definir foco inicial, contenção quando modal, Escape apropriado e retorno do foco ao gatilho. Em menus e comboboxes, preferir primitivas mantidas e testar a integração. Usar dropdown somente quando necessário; um select nativo pode ser melhor.

Botões indisponíveis precisam de motivo quando não for evidente. Não entregar uma coleção de ações "em breve" para simular produto. Um estado desativado legítimo por permissão, validação ou pendência deve ter comunicação adequada.

## Formulários e arquivos

Associar rótulos e campos; usar autocomplete e tipos apropriados. Mostrar erro perto do campo e resumo quando útil. Preservar entrada em falha, posicionar foco com cuidado e informar submissão pendente. Evitar duplicação e tratar cliques/retries no servidor também.

Validação cliente melhora experiência; servidor continua obrigatório. Não usar placeholder como único rótulo. Não bloquear colagem em senha ou código. Pedir só dados necessários.

Upload precisa de seleção real, limites claros, progresso quando disponível, cancelamento apropriado e validação no servidor. `accept` não é segurança. Preview local exige liberação de object URLs. Download deve retornar arquivo válido, com nome e conteúdo corretos; tratar erro antes de salvar um corpo JSON como PDF.

## Responsividade e assets

Testar em torno de 360–390 px, tablet quando relevante e desktop em 1280–1440 px; incluir um cenário mais estreito ou zoom de acordo com WCAG. Esses tamanhos são amostras de QA, não breakpoints universais.

Não esconder a ação principal no mobile. Tabelas podem ter scroll identificado, colunas prioritárias ou visão alternativa apropriada; preservar cabeçalhos e comparação. Tratar overflow de nomes, URLs, localizações e valores negativos.

Definir tamanho de imagens para evitar saltos. Usar formatos, resolução e carregamento adequados; não lazy-load o principal elemento visual automaticamente. Fornecer texto alternativo que dependa da função da imagem. Preferir SVG de ícones de fonte confiável, sem scripts. Carregar só pesos de fonte usados e documentar licença.

## Verificação

Percorrer o fluxo com teclado e toque, testar URL direta e voltar/avançar, recarregar após salvar e simular falhas. Verificar console, rede, estados vazios, falta de acesso e conteúdo longo. Testar visualmente, sem depender apenas de build ou lint.

Fontes: [Next server/client components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [SvelteKit](https://svelte.dev/docs/kit/introduction), [React Router rendering](https://reactrouter.com/start/framework/rendering), [Playwright](https://playwright.dev/docs/best-practices).
