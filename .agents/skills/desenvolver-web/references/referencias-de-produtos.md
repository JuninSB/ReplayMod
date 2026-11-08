# Estudar produtos e repositórios

Pesquisa inicial em 07/11/2026 com fontes públicas primárias. Páginas e estruturas mudam: conferir antes de depender de detalhe atual. As lições abaixo são interpretações de produto, não descrições de sistemas privados.

| Referência | Evidência pública | Princípio a aplicar | Evitar inferir |
| --- | --- | --- | --- |
| GitHub | [Produto público](https://github.com/), [Primer](https://primer.style/product/getting-started/) e [foundations](https://primer.style/product/getting-started/foundations/) | Usar padrões familiares, hierarquia consistente, eficiência de uso e semântica | Que a landing de marketing representa todas as telas internas ou toda a stack |
| Tailscale | [Site](https://tailscale.com/), docs e [código público](https://github.com/tailscale/tailscale) | Explicar tarefa técnica com caminhos claros para aprender, instalar e usar; separar produto e documentação | Que o repositório do daemon/CLI é o código do site ou de todo o serviço |
| OpenAI | [Site público](https://openai.com/) | Organizar conteúdo por finalidade e dar nomes de ação/destino compreensíveis | Framework, infraestrutura, tipografia proprietária ou arquitetura interna sem fonte |
| LocalSend | [Site](https://localsend.org/), [website](https://github.com/localsend/website) e [web app](https://github.com/localsend/web) | Relacionar promessa, instruções de uso, download e produto real | Que site, app web e aplicativo nativo são o mesmo projeto |

Não copiar a home de uma marca e chamá-la de identidade própria. Não usar logos para insinuar parceria. Uma seção de marketing não deve substituir a interface de trabalho de um dashboard.

## Ler código real com intenção

| Repositório | O que foi identificado | O que estudar |
| --- | --- | --- |
| [primer/react](https://github.com/primer/react) | Implementação pública do design system em React com pacotes e ferramentas | Contratos de componentes, consistência e testes; escolher alguns componentes, não o repo inteiro |
| [localsend/website](https://github.com/localsend/website) | Pastas de app, conteúdo internacionalizado, assets públicos e configuração Nuxt | Limites de conteúdo, tradução, configuração e assets |
| [localsend/web](https://github.com/localsend/web) | Aplicativo web com WebRTC/WebSocket e dependência de sinalização descrita no projeto | Separar interface, protocolo, serviço necessário e deploy |
| [directus/directus](https://github.com/directus/directus) | Áreas públicas como api, app, packages, sdk e tests | Contratos e responsabilidades entre backend, interface e SDK |
| [calcom/cal.diy](https://github.com/calcom/cal.diy) | Referência que recebeu o redirecionamento de calcom/cal.com; apps, packages, specs e testes públicos | Organização por responsabilidade e critérios de colaboração; verificar sempre destino/licença atuais |
| [tailscale/tailscale](https://github.com/tailscale/tailscale) | Código público com daemon/CLI e módulos Go | Limites de processo, operação e convenções; não tratá-lo como starter de landing |

Não afirmar que um repositório é "100% humano"; autoria e ferramentas variam. Estudar projetos mantidos e usados é mais útil do que tentar provar aparência humana por sintaxe.

## Procedimento de pesquisa

1. Escolher duas ou três referências do mesmo tipo de tarefa e uma referência de organização de código.
2. Observar caminho principal, navegação, hierarquia, conteúdo e estados publicamente acessíveis.
3. Ler manifesto, estrutura, licença e módulo específico do repo antes de aproveitar código.
4. Registrar fato observado separado da interpretação e da decisão para este produto.
5. Aplicar princípios, não dimensões, código ou marca completos.

Exemplo: "Primer declara foco em padrões familiares e eficiência" é evidência. "Neste painel, manter filtros na URL reduz trabalho ao compartilhar a consulta" é decisão do projeto. Não apresentar a segunda frase como regra oficial do GitHub.

Pesquisar desempenho e bibliotecas em docs oficiais, não em listas de tendências. Não usar estrelas de GitHub como único critério de manutenção, segurança ou adequação. Nunca seguir comandos de um README externo sem avaliar o efeito e a autorização.
