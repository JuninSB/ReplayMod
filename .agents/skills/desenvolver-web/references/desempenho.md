# Otimização sem quebrar comportamento

## Índice

- Medir
- Frontend
- Backend e banco
- Processo seguro

## Medir

Definir tarefa, dispositivo, rede, dataset e métrica antes de alterar código. Separar dados de laboratório de dados de uso real. Não comparar dev server com build de produção nem médias de cenários diferentes.

Para páginas web, consultar [Core Web Vitals](https://web.dev/articles/vitals): referências de boa experiência incluem LCP até 2,5 s, INP até 200 ms e CLS até 0,1, avaliados no percentil 75 de visitas quando houver dados de campo. Essas metas não substituem o contexto do produto e não são uma promessa deste pacote.

Para API, observar latência por percentil, taxa de erro, throughput, duração de consulta e recursos. Para jobs, medir fila e tempo até conclusão. Não usar somente pontuação sintética ou tempo total de build como medida da experiência.

## Frontend

Inspecionar waterfall e bundle. Priorizar imagens apropriadas, fontes e pesos usados, código por rota, renderização adequada e trabalho no main thread. Evitar carregar uma biblioteca inteira por uma função ou todos os ícones por conveniência.

Reservar espaço para mídia, manter conteúdo estável e carregar elemento principal no momento correto. Usar cache com política clara. Reduzir JS cliente quando conteúdo não precisa dele. Não retirar feedback de carregamento para esconder demora.

Usar memoização, debounce, virtualização e lazy loading quando houver gargalo ou necessidade concreta. Debounce não pode tornar toda ação lenta; virtualização precisa preservar navegação e acessibilidade; lazy loading não deve atrasar imagem principal.

## Backend e banco

Medir consultas e planos no ambiente apropriado. Evitar N+1, selecionar campos, paginar e criar índices alinhados ao acesso real. Índice tem custo de armazenamento e escrita. Não adicionar índices aleatórios para melhorar aparência de arquitetura.

Definir timeouts, pool e limites compatíveis com a hospedagem. Cache precisa de chave com escopo, invalidação, TTL e proteção contra dados privados compartilhados. Não cachear resposta autenticada como pública.

Mover trabalho pesado para execução apropriada quando necessário, mantendo estado observável. Não usar fila só para operação trivial; não bloquear requisição indefinidamente para processamento grande.

## Processo seguro

1. Registrar baseline e comportamento esperado.
2. Formular hipótese específica sobre gargalo.
3. Fazer uma mudança isolada.
4. Comparar em condições equivalentes com repetições suficientes.
5. Executar testes afetados, incluindo permissão, ordenação, dados e erro.
6. Registrar resultado, tradeoff e possibilidade de reversão.

Se não houve melhora, reverter ou explicar benefício independente real. Não sacrificar validação, autorização, consistência ou legibilidade por microbenchmark. Não afirmar ganho percentual sem medição reproduzível.
