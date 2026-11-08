# Receitas por tipo de produto

## Índice

- Landing e site institucional
- Painel e dashboard
- API
- Conteúdo e documentação
- Comércio e fluxo transacional
- Ferramenta local
- Aplicativo nativo e jogo

## Landing e site institucional

Apresentar o que é, para quem é, como funciona e o próximo passo. Escolher seções pelo conteúdo disponível: demonstração, benefícios concretos, detalhes, perguntas reais e contato. Não exigir três cards, depoimentos, tabela de preços ou frase superlativa.

CTA deve ter destino real. Formulário precisa validar, enviar/persistir pelo canal autorizado e informar resultado verdadeiro. E-mail por `mailto:` pode ser adequado se esse for o fluxo escolhido e explicado; não simular entrega. Verificar navegação, links, metadados e conteúdo indexável conforme necessidade.

Usar prova verificável ou removê-la. Só adicionar preços, parceiros, comparações e avaliações se forem fatos. Descrever privacidade de acordo com coleta real. Não adicionar cookie banner se não existe mecanismo que o justifique; avaliar requisitos atuais do contexto.

## Painel e dashboard

Começar pelas decisões que o painel apoia e pelas tarefas recorrentes. Mostrar unidades, período, fuso, origem e atualização. Um gráfico precisa responder uma pergunta; números decorativos não substituem informação.

Definir navegação principal, contexto atual e ações por registro. Usar tabelas para comparação e detalhe para aprofundar. Busca, ordenação, filtro, paginação, exportação e ações em lote precisam funcionar se estiverem visíveis. Se uma função não faz parte do escopo, não exibi-la como promessa decorativa.

Preservar filtros na URL quando compartilháveis. Separar vazio inicial, filtro sem resultado, erro, stale data e falta de acesso. Métricas agregadas devem respeitar escopo e permissão. Preferir tabs para perspectivas do mesmo objeto; usar rotas para destinos independentes.

Testar uma conta sem dados, registros longos, permissões diferentes, falha de rede e mais dados do que cabem numa página. Não gerar valores aleatórios em cada render para o painel parecer vivo.

## API

Definir consumidores, recursos, autenticação, autorização, contratos, limites e compatibilidade. Implementar o backend real sem inventar um dashboard obrigatório. Publicar documentação de rotas, exemplos de requisição/resposta e erros, sem credenciais reais.

Testar validação, paginação, idempotência quando necessária, concorrência e acesso de outro usuário. Distinguir API pública de endpoint interno do app. Não criar versionamento arbitrário em cada rota; definir política adequada aos consumidores.

## Conteúdo e documentação

Priorizar arquitetura de informação, busca quando necessária, navegação lateral coerente, links estáveis e versão do conteúdo. Código em tutorial precisa ser compatível com a versão declarada. Exemplo não executável deve ser identificado, não apresentado como comando pronto.

Garantir leitura sem depender de efeitos visuais. Criar índice e headings úteis; tratar links quebrados. Manter conteúdo e assets com origem/licença. Não instalar CMS para três páginas estáticas sem requisito de edição que o justifique.

## Comércio e fluxo transacional

Validar preço, estoque, descontos, autorização e total no servidor. Usar integração mantida do provedor escolhido, com webhook validado e idempotente. Diferenciar pedido criado, pagamento pendente, pago, cancelado e reembolsado. Não liberar produto só por query string de retorno.

Revisar moeda, arredondamento, prazo, endereços e falhas. Proteger dados pessoais. Não inventar integração de pagamento para completar a aparência. Usar sandbox do provedor para teste e autorização apropriada para operações reais.

## Ferramenta local

Uma ferramenta pode ser completa sem backend. Definir dados locais, persistência opcional, exportação/importação e limites. Informar quando nada é enviado ao servidor somente se isso for verdadeiro, incluindo telemetria e dependências.

Testar arquivos grandes, formatos inválidos, recarregamento e privacidade. Não criar login ou servidor só para uma operação que funciona melhor localmente. Distinguir arquivo salvo no dispositivo de dado sincronizado entre contas.

## Aplicativo nativo e jogo

Para desktop e celular, identificar plataforma, entradas, janela ou telas e convenções locais. Para jogos, considerar menu principal, pausa, HUD e configurações conforme o escopo; organizar opções em categorias compreensíveis. Implementar ações e persistência reais, incluindo controle, teclado ou toque quando suportados. Consultar [interfaces nativas](interfaces-nativas.md), [interfaces de jogos](interfaces-jogos.md) e [UI universal](ui-universal.md).
