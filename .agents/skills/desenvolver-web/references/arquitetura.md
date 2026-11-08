# Arquitetura e organização proporcionais

## Índice

- Limites
- Produto e desenvolvimento
- Módulos
- Nomes e comentários
- Evolução

## Limites

Começar pelo caminho dos dados e responsabilidades. Preferir monólito modular quando uma implantação atende. Dividir serviços por necessidade de operação, segurança, escala ou equipe. Preservar stack e convenções existentes.

| Situação | Organização inicial |
| --- | --- |
| Landing ou conteúdo | Um app estático/SSR e integração necessária |
| Aplicação com servidor próximo da interface | Framework fullstack, módulos server-only e domínio separado |
| API para vários clientes | API com contrato público; web separado se houver |
| Vários apps com reuso real | Workspace com apps e pacotes consumidos |

Não usar monorepo, microserviços, CQRS, event bus ou container de injeção por padrão. Um módulo pode começar com dois arquivos e crescer por necessidade.

## Produto e desenvolvimento

Em projeto novo, usar como mapa, criando só o necessário e respeitando as convenções da plataforma ou engine:

| Caminho | Responsabilidade |
| --- | --- |
| `product/` | Código, assets, migrações e configuração de build/execução usados |
| `docs/` | Produto, design, decisões, contratos e operação |
| `tests/` | Testes e fixtures, quando a stack permite separação simples |
| `tools/` | Scripts locais, manutenção e geração |
| `contexto.md` | Estado, caminhos, comandos, decisões e pendências |
| `AGENTS.md` | Instruções estáveis de contribuição |

Manifesto, lockfile e configuração de compilação pertencem ao produto mesmo quando mencionam ferramentas de desenvolvimento. A árvore fonte não é o artefato de produção. Gerar deploy com runtime e dependências necessárias, sem testes, dumps, `.git`, segredos, caches ou screenshots por acidente.

Guardar dados persistentes fora da árvore de código e de diretórios efêmeros. Definir banco/volume e recuperação. `public/` não é lugar para documentos privados.

Se um framework exige outro layout ou testes colocalizados, preservar a convenção e documentar limites equivalentes. Não mover projeto saudável para obedecer uma árvore. Não criar diretórios vazios de decoração.

Em jogos e apps nativos, preservar a localização de cenas, recursos, manifestos e configurações exigidas pela engine ou pelo sistema operacional. Não exigir `product/`, `server.ts`, Node ou servidor para uma interface local; organizar os limites equivalentes da forma suportada pela tecnologia escolhida.

## Módulos

Exemplo para uma API, não estrutura obrigatória:

| Arquivo | Função |
| --- | --- |
| `app.ts` | Montar aplicação e dependências, sem abrir porta ao importar |
| `server.ts` | Carregar configuração, iniciar e encerrar recursos |
| `features/invites/routes.ts` | HTTP, schema, sessão e caso de uso |
| `features/invites/create-invite.ts` | Regra de criação e resultado |
| `features/invites/invite-store.ts` | Consultas específicas de convites |
| `features/invites/schema.ts` | Contratos de entrada/saída |
| `db/` | Conexão, transações e migrações |
| `config.ts` | Validar configuração no início |

Separar transporte, regra e infraestrutura quando isso melhora navegação ou testes. Evitar camadas que apenas encaminham parâmetros. Não usar limite fixo de linhas como prova de qualidade.

No frontend, agrupar funcionalidades e compartilhar primitivas consistentes. Separar API e apresentação quando reduz acoplamento. Manter banco, segredos e implementação do servidor fora do bundle. Compartilhar contratos mínimos, sem pacote que exponha o backend inteiro.

## Nomes e comentários

Usar verbos e objetos: `listDevices`, `createInvite`, `saveProfile`, `revokeSession`. Usar substantivos para tipos: `Invoice`, `Session`, `DeviceStatus`. Manter idioma e convenção do repositório.

Evitar `handleData`, `processStuff`, `GenericService`, `helpers2` e `ManagerFactoryProvider`. `handleSubmit` é aceitável num formulário local claro. Um nome simples não precisa repetir o módulo inteiro.

Expressar estados distintos no retorno; reduzir booleanos ambíguos e exceções silenciosas. Não usar `any`, casts e suppressions para esconder contrato quebrado. Comentar por que há uma decisão, limite ou condição surpreendente. Documentar funções públicas e invariantes importantes; não narrar cada linha.

## Evolução

Antes de refatorar, identificar comportamento e consumidores. Mudar uma responsabilidade por vez, preservar contrato ou oferecer transição e executar testes afetados. Não misturar redesign, otimização e migração total de banco sem necessidade.

Confirmar uso em imports, scripts, plugins, configuração e carregamento dinâmico antes de remover arquivos ou dependências. Knip ajuda a encontrar candidatos, mas exige configuração e revisão. Não deletar por busca textual isolada.

Estudar separação de responsabilidades em [Directus](https://github.com/directus/directus) e [Primer React](https://github.com/primer/react). A dimensão desses projetos não é recomendação para projetos pequenos.
