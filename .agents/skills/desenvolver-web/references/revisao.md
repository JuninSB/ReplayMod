# Autorrevisão com evidência

## Índice

- Passagem separada
- Critérios
- Inspeção de UI
- Ferramenta estática
- Registro de achados
- Verificação final

## Passagem separada

Revisar o diff e o fluxo como alguém que não acompanhou a implementação. Reabrir requisitos e critérios de aceite. Não se limitar a explicar por que o código deve funcionar. Executar caminhos que podem contrariar a hipótese inicial.

Fazer autorrevisão em toda entrega relevante. Um segundo revisor humano ou agente independente pode ajudar quando disponível e permitido, mas não substituir a própria leitura. Não alegar revisão independente quando a mesma passagem gerou e aprovou o código.

## Critérios

| Área | Perguntas que precisam de evidência |
| --- | --- |
| Escopo | O que foi pedido funciona? Algo foi omitido ou substituído por demo? |
| Ações | Cada controle importante chega a operação real e resultado observável? |
| Dados | Salvar persiste conforme o requisito? Recarregar/reiniciar mantém o estado esperado? |
| Acesso | Outro usuário/tenant consegue ler ou alterar indevidamente? |
| Contrato | Entradas inválidas, campos extras, limites e erros estão tratados? |
| Falhas | Dependência indisponível, timeout, duplicação e conflito deixam estado compreensível? |
| Interface | Há loading, vazio, erro, permissão e sucesso verdadeiros? |
| Acessibilidade | Teclado, foco, nomes, contraste e leitura foram verificados no escopo? |
| Design | Existe sistema próprio e coerente, conteúdo real e pouca decoração sem função? |
| Código | Nomes são claros, responsabilidades coerentes e abstrações justificadas? |
| Desempenho | A otimização foi medida e manteve comportamento? |
| Operação | Build e início corretos, configuração, migrações e recuperação estão claros? |
| Continuidade | Contexto e docs correspondem aos arquivos e resultados atuais? |

Para cada ação crítica, seguir UI → cliente → endpoint/caso de uso → autorização → dados/serviço → resposta → estado final. Em recurso só local, seguir até transformação, armazenamento ou arquivo de saída. Não inventar servidor para completar o diagrama.

Executar teste adequado ao risco. Regra financeira pede testes precisos; ajuste simples de espaçamento pode pedir inspeção e testes existentes. Não adicionar testes que só conferem o texto de uma função ou espelham a implementação.

## Inspeção de UI

Para criação, redesign ou alteração relevante de interface, aplicar [julgamento](julgamento-ui.md), [inspeção visual](inspecao-visual.md) e [adaptação](adaptacao-mobile-desktop.md) conforme o escopo. Se houver recursos visuais autorizados, executar e observar a tela, interagir, corrigir e conferir o resultado. Marcar a evidência por ambiente e estado; se só houve análise de código ou simulação, deixar a observação visual pendente.

Revisar uma tarefa principal e os estados afetados: encontrar a seção, abrir/fechar um menu, editar, aplicar/cancelar e voltar. Conferir hierarquia, rótulos, foco, cortes, sobreposição e conteúdo longo. Verificar teclado virtual, orientação, redimensionamento ou controle quando suportados. Não inferir o dispositivo físico pelo layout: os prints desktop do YouTube fornecidos foram feitos num celular em modo desktop.

Na revisão final, separar defeito observado, hipótese e preferência visual. Priorizar ações inacessíveis, perda de estado e problemas que impedem a tarefa antes do acabamento. Não substituir uma inspeção real pelo relatório do script abaixo.

## Ferramenta estática

```bash
node /caminho/desenvolver-web/scripts/revisar-projeto.mjs /caminho/projeto
node /caminho/desenvolver-web/scripts/revisar-projeto.mjs /caminho/projeto --json
node /caminho/desenvolver-web/scripts/revisar-projeto.mjs /caminho/projeto --strict
```

O script apenas lê metadados e arquivos selecionados. Não executa imports, scripts do projeto, comandos Git nem chamadas de rede. Não altera arquivos. Ignora links simbólicos, diretórios gerados comuns e `.env` real. Não imprime trechos de código ou valores de candidatos a segredo.

Ele detecta padrões simples como links vazios, handlers explicitamente vazios, alertas possivelmente usados como efeito, tarefas pendentes e uso de HTML cru. Lista manifestos, scripts de verificação e documentação ausente. Um arquivo grande é apenas candidato de revisão, nunca erro por tamanho.

Limitações: usa regex, não AST ou análise de fluxo; pode marcar comentário, string ou caso legítimo; pode não perceber controle desconectado, sanitização correta ou vulnerabilidade. Não analisa dependências transitivas nem executa scanner completo de segredos. Não entende autorização, persistência, acessibilidade ou identidade visual. Não ler `.env` é uma escolha de privacidade, não uma prova de que seus valores são seguros.

Retorno: `0` quando conclui sem modo estrito bloqueado; `1` no modo `--strict` com sinais altos/críticos; `2` para uso inválido ou falha de leitura essencial. O campo `complete` se refere somente ao escopo de texto selecionado: limites, links simbólicos, arquivos grandes ou falhas de leitura podem torná-lo `false`. Exclusões previstas, como diretórios gerados e `.env`, continuam fora desse escopo mesmo com `complete: true`. Nem `0` nem ausência de achados significam produto aprovado.

Não usar como gate universal sem adequar regras, configurar exclusões e revisar falsos positivos. Em repositórios existentes, combinar com ferramentas próprias, tipos, testes e inspeção do navegador.

## Registro de achados

Usar severidade proporcional, caminho e linha, impacto, evidência e correção sugerida. Evitar dezenas de preferências estéticas como se fossem falhas de segurança.

| Nível | Significado |
| --- | --- |
| Crítico | Risco grave comprovado, como exposição real de credencial ativa |
| Alto | Fluxo essencial quebrado, autorização ausente ou perda de dados plausível e sustentada |
| Médio | Problema funcional, acessibilidade ou manutenção com impacto delimitado |
| Baixo | Melhoria localizada de clareza ou consistência |

Separar suspeita de defeito confirmado. Corrigir achados críticos/altos dentro do escopo e repetir verificações afetadas. Se depender de ação externa ou contexto ausente, descrever o bloqueio sem declarar aprovação final.

## Verificação final

Atualizar `docs/verificacao.md` e `contexto.md` com comandos, diretório, data, resultado e limites. Nunca alterar o resultado registrado para parecer verde. Remover arquivos temporários e demos do artefato, preservando trabalho alheio. Entregar explicação curta do que mudou e da evidência que sustenta o resultado.
