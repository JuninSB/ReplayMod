# Backend modular e contratos

## Índice

- Escolha e fronteiras
- Contrato HTTP
- Dados e consistência
- Integrações e operação
- Testar comportamento

## Escolha e fronteiras

Para projeto novo que precisa de frontend e API customizáveis, considerar TypeScript com runtime suportado e um framework apropriado. Usar rotas server-side do framework fullstack se atendem; não adicionar servidor separado sem motivo. Considerar Fastify para API modular em Node e Hono para cenários compatíveis com Web Standards e os runtimes suportados. Conferir adaptadores, limites, suporte e versões atuais.

Go pode servir API e serviços com implantação em binário quando requisitos e experiência justificam. Lua/OpenResty pode ser adequado a infraestrutura existente e especialistas; verificar bibliotecas, drivers, testes, concorrência e deploy. O navegador não passa a executar Lua só porque o servidor a usa. Linguagens se comunicam por HTTP, eventos ou outro contrato definido.

Não usar Python como nova escolha neste pacote. Não migrar código existente sem autorização. A modularidade depende das responsabilidades e dos contratos, não do nome da linguagem.

Separar montagem da aplicação do início do processo para facilitar testes. Validar configuração ao iniciar, fechar conexões no encerramento e falhar com mensagem útil sem mostrar segredos.

## Contrato HTTP

- Validar params, query, headers relevantes e body no limite de entrada.
- Não confundir tipos TypeScript com validação em runtime.
- Aceitar somente campos que o cliente pode editar; evitar mass assignment.
- Validar também saída pública para evitar vazamento de campos internos.
- Definir status, corpo de sucesso, formato de erro e compatibilidade.
- Usar limite máximo de página, ordenação permitida e paginação estável.
- Colocar autenticação e autorização perto do limite e nas invariantes necessárias.
- Documentar contrato consumido por outros clientes em OpenAPI ou equivalente apropriado.

Exemplo de erro público a adaptar:

```json
{
  "error": {
    "code": "INVITE_ALREADY_EXISTS",
    "message": "Já existe um convite pendente para este endereço.",
    "requestId": "identificador-da-requisicao"
  }
}
```

Não retornar stack trace ou detalhes de banco. Diferenciar erro de validação, ausência de autenticação, falta de permissão, conflito e falha transitória. Não devolver 200 para todos os casos. Não revelar a existência de recurso privado quando a política exige ocultação.

Com [Fastify](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/), definir schemas de entrada/saída e conhecer o compilador usado. Schemas são código confiável: não compilar schemas arbitrários enviados pelo usuário. Em [Hono](https://hono.dev/docs/guides/validation), configurar validação e tipo de conteúdo corretamente; a biblioteca não torna todo endpoint validado automaticamente.

## Dados e consistência

Escolher banco pelo ambiente e requisitos. PostgreSQL é opção para dados relacionais compartilhados; SQLite pode atender aplicação local ou servidor único, desde que volume e concorrência sejam apropriados. Arquivo num container efêmero não é persistência durável.

Definir chaves, relações, constraints, índices justificados e migrações versionadas. Uma validação prévia de unicidade na aplicação não substitui constraint do banco em concorrência. Usar consultas parametrizadas e whitelist para identificadores/ordenação dinâmica. ORM não elimina necessidade de entender SQL e autorização.

Agrupar alterações relacionadas em transação. Definir comportamento de conflito e repetição. Para operação com efeito financeiro ou externo, considerar chave de idempotência e armazenamento do resultado. Distinguir retry seguro de repetição que duplica efeitos.

Não persistir campos calculáveis sem motivo nem buscar tabela inteira para filtrar no navegador. Selecionar campos necessários; evitar N+1; definir limites. Filtrar por usuário/tenant na consulta e verificar permissões, em vez de buscar tudo e confiar na tela.

Backup precisa de restauração testada. Migração destrutiva precisa de autorização aplicável, plano de recuperação e compatibilidade com a versão em uso. Não usar `db push` ou recriar tabelas em dados reais sem avaliar impacto.

## Integrações e operação

Usar timeout, tratamento de falha, limites e retries com backoff apenas quando seguros. Validar destinos de requisição quando o usuário influencia URLs. Não aceitar redirecionamento externo arbitrário nem tratar resposta de terceiro como confiável.

Webhooks exigem verificação de assinatura com biblioteca do provedor, controle de repetição e processamento idempotente. Uploads exigem limites, validação, armazenamento apropriado e autorização de leitura. Proteger downloads e links temporários.

Não prometer envio de e-mail após só salvar uma tarefa. Diferenciar aceito, persistido, enviado e confirmado. Se banco e serviço externo precisam de consistência, avaliar outbox transacional ou mecanismo proporcional, sem adicioná-lo a operações triviais.

Registrar logs estruturados com identificador de requisição, resultado e duração. Evitar body completo, tokens e dados pessoais desnecessários. Distinguir liveness e readiness onde a infraestrutura usa essas verificações. Uma rota de saúde não deve expor configuração sensível.

## Testar comportamento

Testar regra de negócio, contrato, banco e integrações nos limites relevantes. Incluir entrada inválida, acesso de outro usuário, conflito concorrente, falha de dependência e persistência após reinício quando aplicável. Usar banco de teste isolado e fixtures próprias, sem dados reais.

Fontes: [TypeScript](https://www.typescriptlang.org/docs/handbook/intro.html), [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html), [SQLite](https://www.sqlite.org/whentouse.html), [Go](https://go.dev/doc/), [OpenResty](https://openresty.org/en/), [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).
