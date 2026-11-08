# Escolher stack, bibliotecas e kits

## Índice

- Processo de escolha
- Arquiteturas iniciais
- Componentes e estilo
- Ícones
- Ferramentas de engenharia

## Processo de escolha

Reutilizar a stack existente. Para projeto novo, escolher pela tarefa, hospedagem, experiência, orçamento de manutenção, dados e requisitos de renderização. Registrar uma justificativa curta e a principal alternativa descartada. Não adicionar tecnologia só porque aparece na lista.

Conferir documentação, versões suportadas, histórico recente, compatibilidade e licença antes da instalação. Usar lockfile e runtime suportado. Não fixar neste pacote o número de versão que será "o atual" para sempre. Nunca copiar uma instrução `@latest` para automação de produção sem resolver e registrar a versão apropriada.

## Arquiteturas iniciais

| Necessidade | Opção a avaliar | Motivo e limite |
| --- | --- | --- |
| Landing e conteúdo | HTML/CSS com JS pequeno ou [Astro](https://astro.build/) | Priorizar conteúdo e pouco JS; incluir integração real quando houver ação remota |
| App fullstack com simplicidade de fluxo | [SvelteKit](https://svelte.dev/docs/kit/introduction) + TypeScript | Rotas, dados e ações no mesmo projeto; avaliar ecossistema e experiência |
| App React com rotas e dados | [React Router](https://reactrouter.com/start/framework/rendering) ou [Next.js](https://nextjs.org/docs/app/getting-started/server-and-client-components) | Escolher um modelo de renderização e dados, sem misturar padrões incompatíveis |
| SPA de painel com API existente | Framework já usado com build apropriado | Não criar SSR ou outro backend sem necessidade |
| API Node modular | [Fastify](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/) + TypeScript | Schemas e plugins; conhecer limites e configuração |
| API em runtimes Web Standards | [Hono](https://hono.dev/docs/guides/validation) + TypeScript | Verificar adaptador, bibliotecas e APIs disponíveis no destino |
| Serviço com implantação em binário | [Go](https://go.dev/doc/) | Útil quando operação e requisitos justificam outra linguagem |
| Infraestrutura Lua existente | [OpenResty](https://openresty.org/en/) | Adequado a contexto específico; avaliar ecossistema antes de escolher |
| Dados relacionais compartilhados | [PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html) | Constraints, transações e operação precisam ser projetadas |
| Aplicação local ou servidor adequado | [SQLite](https://www.sqlite.org/whentouse.html) | Avaliar concorrência, volume persistente, backup e hospedagem |
| SQL com tipos e migrações em TS | [Drizzle](https://orm.drizzle.team/docs/overview) ou ferramenta existente | Não adicionar ORM sobre outro ORM; SQL parametrizado também é válido |

TypeScript é uma preferência deste pacote, não um requisito universal da web. Ele oferece linguagem e tipos comuns, mas continua precisando de contrato, validação de runtime e isolamento server/client. Não colocar banco ou segredo em pacote compartilhado do frontend.

## Componentes e estilo

| Recurso | Quando ajuda | Cuidado |
| --- | --- | --- |
| HTML nativo + CSS/CSS Modules | Interações simples e identidade própria | Preservar comportamento e semântica nativos |
| [Tailwind](https://tailwindcss.com/docs/theme) | Equipe que prefere utilitários e tokens | Definir sistema visual; classes não escolhem design |
| [React Aria](https://react-aria.adobe.com/) | Comportamentos acessíveis customizáveis em React | Testar composição, foco e nomes acessíveis |
| [Radix Primitives](https://www.radix-ui.com/primitives/docs/overview/introduction) | Primitivas de interação em React | Integrar com cuidado; não presumir conformidade final |
| [shadcn/ui](https://ui.shadcn.com/docs) | Componentes como código sob controle do projeto | Adaptar, remover o que não usa e manter atualizações |
| [Primer](https://primer.style/product/getting-started/) | Estudar ou adotar um sistema de produto coerente | Verificar compatibilidade; não copiar identidade do GitHub sem motivo |

Não instalar todos. Escolher uma base de comportamento e um sistema de estilo. Não duplicar diálogos, dropdowns e campos com kits concorrentes. Design system é consistência de decisões e comportamento, não quantidade de componentes.

## Ícones

| Kit | Uso a avaliar | Fonte |
| --- | --- | --- |
| Octicons | Linguagem de ferramenta e colaboração | [Primer Octicons](https://primer.style/octicons/) |
| Heroicons | Interface com símbolos de pesos consistentes | [Heroicons](https://heroicons.com/) |
| Phosphor | Família com opções de peso para direção própria | [Repositório oficial](https://github.com/phosphor-icons/core) |
| Lucide | Interface com conjunto consistente de SVGs | [Documentação React](https://lucide.dev/guide/react) |
| Simple Icons | Marcas de integrações realmente presentes | [Repositório oficial](https://github.com/simple-icons/simple-icons) |

Escolher uma família principal, tamanho e peso. Usar ícone para reconhecer ação/estado, não para preencher todo título. Rótulos continuam necessários em ações ambíguas. Importar somente ícones usados; não enviar catálogo inteiro por importação dinâmica indiscriminada. Verificar licença da distribuição e restrições de marca. O pacote oferece curadoria, não cópias de assets de terceiros.

## Ferramentas de engenharia

Usar as já configuradas quando adequadas. Considerar [Vitest](https://vitest.dev/guide/) para regras e módulos no ecossistema compatível, [Testing Library](https://testing-library.com/docs/guiding-principles/) para comportamento de interface e [Playwright](https://playwright.dev/docs/best-practices) para fluxos reais. Usar o runner nativo do Node quando suficiente.

Manter um caminho consistente de formatação/lint, como configuração existente ou [Biome](https://biomejs.dev/), sem sobrepor ferramentas que discordam. Usar [Knip](https://knip.dev/overview/getting-started) para candidatos a código/dependências não usados; revisar entradas dinâmicas antes de excluir.

Documentar scripts de dev, build, check e teste conforme a stack; não criar comandos fictícios nem scripts que sempre retornam sucesso. Ferramentas opcionais, MCPs e skills dependem do ambiente: verificar disponibilidade e ler instruções atuais. A documentação não instala ferramentas nem concede permissões.
