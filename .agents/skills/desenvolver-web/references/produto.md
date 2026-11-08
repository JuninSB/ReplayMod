# Produto antes do código

## Índice

- Resultado e perguntas
- Inventário de ações
- Conveniência e confiança
- Fatiamento

## Resultado e perguntas

Escrever uma frase concreta: "A pessoa consegue localizar uma cobrança, corrigir seus dados e baixar o recibo". "Uma plataforma moderna e intuitiva" não especifica operação nem permite avaliar sucesso.

Registrar público, contexto de uso, dados disponíveis, fluxo principal, critérios de aceite e exclusões. Ajustar o documento: uma landing pode precisar de dez linhas; uma API com dados sensíveis pede contratos e regras detalhados. Escopo reduzido pode ser completo. Um formulário conectado com validação e resposta verdadeira é melhor que vinte telas sem persistência.

Perguntar quando a resposta muda uma decisão importante. Agrupar perguntas sobre público, marca, fonte de dados, contas, integrações e hospedagem. Propor uma stack com motivo em vez de pedir escolha entre seis frameworks. Reaproveitar preferências e autorizações. Enquanto aguarda, inspecionar o projeto e avançar nas partes independentes.

Se não houver Git, oferecer uma vez repositório local e commits. Sem resposta, continuar arquivos e verificações sem inicializar. Separar essa escolha de criar remoto ou publicar, que são ações diferentes.

## Inventário de ações

Especificar operação antes de estilizar seu botão. Usar a tabela de rastreabilidade para fluxos reais do pedido:

| Ação | Origem | Operação | Resultado | Falha | Evidência |
| --- | --- | --- | --- | --- | --- |
| Criar convite | Formulário | Validar, autorizar, salvar e enviar pelo serviço configurado | Registro pendente com identificador | Duplicação, limite, indisponibilidade | Integração e navegador |
| Filtrar cobranças | URL e filtro | Consultar o escopo autorizado | Lista e total coerentes | Filtro inválido, página vazia | Reabrir URL e comparar |
| Baixar recibo | Registro | Autorizar e gerar/obter arquivo | Download válido | Sem acesso, arquivo indisponível | Abrir arquivo e testar outra conta |

Não criar esses exemplos se não fizerem parte do pedido. Numa landing, o inventário pode conter apenas navegação, download e contato.

Definir operações locais. Um conversor pode funcionar no navegador; preferências podem usar armazenamento local com limites explícitos. Dados compartilhados e contas precisam de fonte de verdade adequada. Não chamar localStorage de banco multiusuário nem exibir sucesso de cadastro após só atualizar uma variável.

## Conveniência e confiança

- Mostrar próximo passo perto da informação que permite decidir.
- Preservar campos após erro e filtros após navegação.
- Evitar solicitar dados conhecidos; permitir colar senhas e usar gerenciadores.
- Tornar ações destrutivas específicas, com recuperação ou confirmação proporcional.
- Mostrar progresso real e permitir retomar tarefas longas quando adequado.
- Identificar unidades, período, fuso e atualização dos dados.
- Distinguir ausência de dados, filtro sem resultado e erro de carregamento.
- Oferecer saída: cancelar, voltar, corrigir, repetir ou pedir acesso.
- Usar vocabulário do domínio, sem expor detalhes internos desnecessários.

Métricas, avaliações, clientes, preços e selos precisam de origem. Sem comprovação, usar explicação, demonstração real ou exemplo identificado. Não inventar contagens para preencher a composição.

## Fatiamento

Definir três a cinco critérios reproduzíveis: criar item, recarregar, encontrá-lo na mesma conta e negar acesso a outra conta, por exemplo. Implementar primeiro um caminho completo e suas falhas. Expandir depois.

Registrar ideias futuras sem colocar botões decorativos na interface. Se uma integração estiver bloqueada por configuração, mostrar o estado real e descrever o ponto pendente. Não reduzir escopo silenciosamente nem declarar conclusão para algo sem efeito real.
