# Documentação para humanos e outros agentes

## Índice

- Documentos e função
- Manter contexto confiável
- Uso dos modelos
- Transferência

## Documentos e função

| Documento | Responsabilidade | Atualizar quando |
| --- | --- | --- |
| `contexto.md` | Estado atual, mapa, comandos, decisões, evidências e próximo passo | Uma entrega muda código, operação ou pendência |
| `AGENTS.md` | Regras estáveis de contribuição e ponte para o contexto | Convenções ou limites de trabalho mudam |
| `docs/produto.md` | Usuário, escopo, fluxos e aceite | Requisito ou comportamento esperado muda |
| `docs/design.md` | Direção visual, tokens e comportamento | Sistema visual muda |
| `docs/arquitetura.md` | Limites, dados, contratos e implantação | Uma decisão estrutural muda |
| `docs/api.md` ou OpenAPI | Contrato consumido por outros clientes | Entrada, saída ou política de compatibilidade muda |
| `docs/operacao.md` | Configurar, iniciar, migrar, observar, recuperar | Um procedimento operacional muda |
| `docs/verificacao.md` | O que foi efetivamente executado e achados | Há nova rodada relevante de verificação |
| `docs/inspecao-ui.md`, quando útil | Rodadas de observação de telas, mudanças e limites por ambiente | Uma revisão de UI precisa de registro detalhado |
| `docs/decisoes/` | Decisões duradouras com motivo e tradeoffs | Decisão não óbvia passa a orientar o projeto |

Não criar todos automaticamente. Uma landing simples não precisa de documentação de API inexistente. Evitar duplicar a mesma informação em cinco lugares. Preferir um índice e links para a fonte canônica.

Para UI, registrar o que foi observado na aplicação, o que veio apenas de imagem ou simulação e o que continua pendente. Usar o modelo `inspecao-ui.md` em revisões maiores; numa alteração pequena, a seção de UI do registro de verificação pode bastar.

## Manter contexto confiável

`contexto.md` deve ser curto o bastante para leitura inicial e preciso o bastante para orientar. Incluir data, revisão ou estado identificado, objetivo, o que funciona, caminhos reais, runtime, gerenciador, comandos, variáveis por nome, decisões, verificações e pendências.

Separar fatos verificados, hipóteses e próximos passos. Não escrever "todos os testes passaram" se só houve build. Registrar comando, diretório de execução, resultado, escopo e data. Se uma verificação não pôde rodar, dizer por quê.

Nunca incluir senha, token, connection string real, dados pessoais, cookie de sessão ou dumps. Para credenciais, documentar o nome da variável, propósito e como configurar por canal apropriado. Não copiar conteúdo de logs sensíveis.

Conferir caminhos e comandos depois de mover arquivos. Documento desatualizado é dívida: corrigir com a mudança, não pedir ao próximo agente que adivinhe.

## Uso dos modelos

Copiar modelos de `assets/templates/` apenas quando aplicáveis. Substituir marcadores e remover seções sem função. O inicializador gera documentação inicial, não um produto pronto. Não entregar "A PREENCHER" como evidência de conclusão.

Manter `AGENTS.md` compatível com convenções do agente do ambiente. Outros agentes podem ler Markdown, mas descoberta automática de `AGENTS.md` e skills varia. Não assumir que o arquivo terá prioridade sobre instruções do ambiente.

Comentar funções públicas e invariantes onde ajudam manutenção. Não exigir documentação de cada getter nem repetir assinatura. Escolher exemplos pequenos que mostrem comportamento e erro, com versão da API quando relevante.

## Transferência

Antes de encerrar, pedir a si mesmo: outra pessoa consegue localizar o fluxo, instalar dependências pela versão correta, configurar variáveis sem receber segredos, iniciar o projeto, verificar comportamento e entender a próxima pendência? Se não, completar os itens específicos.

Evitar histórico de conversa e planos abandonados no contexto ativo. Preservar decisões relevantes em documento apropriado. Explicar por que a opção foi escolhida, condição para revisitá-la e riscos concretos.
