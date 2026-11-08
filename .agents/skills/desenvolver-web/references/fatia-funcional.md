# Exemplo: uma funcionalidade do contrato à verificação

## Índice

- Escopo
- Responsabilidades
- Exemplo de regra
- Persistência e transporte
- Interface e aceite

## Escopo

Usar este exemplo para pensar em fronteiras, não para copiar um sistema de convites para qualquer produto. Os trechos são didáticos e parciais; não constituem app pronto. Completar autenticação, validação, banco e execução conforme a stack antes de entregar um projeto real.

Tarefa ilustrativa: uma pessoa com permissão pode criar um convite numa equipe. Outra equipe não pode listar, alterar ou revogar esse convite. Um convite já pendente deve produzir conflito consistente mesmo sob concorrência.

## Responsabilidades

| Parte | Conteúdo |
| --- | --- |
| Contrato | Campos editáveis, resposta, erros, validação de runtime |
| Sessão | Identidade autenticada confiável, obtida do mecanismo configurado |
| Caso de uso | Permissão, regra e resultado |
| Persistência | Constraint e consulta com escopo |
| HTTP | Mapear input/resultado e códigos, sem vazar campos |
| Interface | Campos, submissão real, pendência e erros |
| Teste | Provar comportamento e isolamento |

Não criar uma classe por linha nem tornar o caso de uso um "engine" genérico. Manter nomes próximos do domínio.

## Exemplo de regra

```ts
type Actor = { userId: string };
type InviteInput = { teamId: string; email: string };
type Invite = { id: string; teamId: string; email: string };
type CreateInviteResult =
  | { kind: 'created'; invite: Invite }
  | { kind: 'forbidden' }
  | { kind: 'already-pending' };

type InviteStore = {
  canInvite(userId: string, teamId: string): Promise<boolean>;
  insertPending(input: InviteInput): Promise<
    | { kind: 'inserted'; invite: Invite }
    | { kind: 'conflict' }
  >;
};

export async function createInvite(
  actor: Actor,
  input: InviteInput,
  store: InviteStore,
): Promise<CreateInviteResult> {
  if (!(await store.canInvite(actor.userId, input.teamId))) {
    return { kind: 'forbidden' };
  }

  const result = await store.insertPending(input);
  if (result.kind === 'conflict') return { kind: 'already-pending' };
  return { kind: 'created', invite: result.invite };
}
```

O exemplo torna efeitos e resultados explícitos, mas não garante sozinho autorização transacional. Se uma revogação concorrente precisar impedir a criação, garantir a invariante com transação/bloqueio ou desenho equivalente. Decidir a semântica pelo domínio, em vez de supor que duas chamadas separadas são atômicas.

## Persistência e transporte

Validar email e IDs no limite. Definir política de normalização apropriada; não supor regras universais de email. A implementação de `insertPending` deve usar banco real, query parametrizada e constraint que proteja a unicidade desejada. Traduzir somente o conflito conhecido, sem esconder toda exceção como duplicação.

Filtrar listagens pela equipe autorizada. Em operações por ID, conferir também o vínculo e a operação permitida. Não confiar no `teamId` enviado pelo cliente.

No transporte, obter actor da sessão confiável, validar entrada, chamar regra e mapear resposta. Por exemplo, criação pode retornar 201; falta de permissão e conflito devem ter comportamento definido. Definir resposta de recurso inexistente conforme política de privacidade. Serializar só campos públicos.

Se houver envio de email, definir se o endpoint garante criação ou entrega. Banco e envio não são uma transação única por mágica. Para requisito de envio confiável, avaliar outbox/job e retorno de estado. Sem serviço configurado, não mostrar "email enviado".

## Interface e aceite

Usar formulário com label, validação útil, estado pendente e preservação dos campos em falha. Após sucesso real, atualizar o estado consultado e mostrar convite com status correto. Não reimplementar autorização apenas escondendo o botão.

Verificar:

- Pessoa autorizada cria e encontra o registro após recarregar.
- Pessoa sem permissão não cria nem lista o recurso.
- Outra equipe não acessa o convite trocando identificadores.
- Duas requisições concorrentes não criam duplicação proibida.
- Falha de banco ou envio deixa estado verdadeiro e recuperável.
- Entrada inválida tem erro utilizável, sem stack trace.

Os testes devem observar esses efeitos. Um mock que retorna exatamente o objeto esperado pelo código não substitui o teste de constraint, autorização e persistência do sistema integrado.
