# Observar e refinar a interface

## Índice

- Descobrir os recursos disponíveis
- Planejar a observação
- Executar o ciclo
- Combinar evidências
- Quando não há acesso visual
- Encerrar com limites claros

## Descobrir os recursos disponíveis

Verificar os recursos autorizados do ambiente antes de presumir que a UI não pode ser observada. Um agente com ferramentas de imagens ou captura pode inspecionar o resultado renderizado. Selecionar a ferramenta apropriada e seguir suas instruções; não inventar APIs, assumir sessão autenticada ou usar uma capacidade indisponível.

| Ambiente | Recursos a avaliar |
| --- | --- |
| Web | Navegador autorizado, captura, inspeção de elementos, testes e logs disponíveis |
| App desktop ou móvel | Aplicação, emulador/simulador, captura, árvore de UI e testes do toolkit |
| Jogo | Engine ou build, captura da tela, estado de UI e dispositivos de entrada disponíveis |
| Apenas screenshot fornecida | Inspeção da imagem e perguntas de comportamento que ainda precisam de teste |

Para imagens locais, usar o visualizador disponível. Para testar um app web, reutilizar a integração adequada ao ambiente e consultar documentação quando necessário. Não criar um frontend web separado só para obter screenshot de uma UI nativa. Quando não há emulador, dispositivo ou navegador executável, seguir o caminho de verificação parcial abaixo.

## Planejar a observação

Escolher uma tarefa representativa e os estados afetados. Identificar versão/código, ambiente, tamanho lógico da janela ou viewport, escala, orientação e entradas quando conhecidos. Usar conteúdo representativo e dados de teste estáveis; não inserir dados fictícios numa entrega real para sustentar a composição.

Em projeto existente, observar a tela e reproduzir o problema antes da alteração quando possível. Em projeto novo, implementar um fluxo representativo antes de repetir o padrão por todo o produto. Guardar capturas só quando permitido e necessário. Tratar screenshots que contêm informações privadas conforme as regras do ambiente; não incluir dados pessoais nas referências ou no relatório público.

## Executar o ciclo

1. **Executar:** abrir a interface real ou a representação disponível e chegar ao estado escolhido.
2. **Observar:** inspecionar a imagem/quadro e, quando possível, a árvore de UI. Ler também erros relevantes do ambiente.
3. **Interagir:** percorrer a tarefa, abrir menus, trocar seções, editar, confirmar/cancelar e voltar usando as entradas disponíveis.
4. **Diagnosticar:** registrar problema observável, impacto, hipótese de causa e correção proporcional.
5. **Corrigir:** ajustar a causa ou o componente compartilhado, preservando a identidade aprovada e o comportamento.
6. **Conferir novamente:** repetir o estado e a tarefa alterados e verificar consequências nos outros tamanhos ou estados afetados.

Não produzir uma sequência longa de alterações visuais sem retornar à observação. Não concluir o ciclo apenas porque o build passou ou porque uma captura foi salva. É preciso inspecionar o resultado retornado pela ferramenta.

Observar primeiro a composição inteira no quadro efetivamente visível; examinar detalhes em seguida. Captura de página inteira ajuda a entender conteúdo e overflow, mas não mostra sozinha o que cabe no viewport, como um menu sobrepõe conteúdo ou se a ação ficou atrás do teclado.

Verificar as condições relevantes, sem criar uma matriz enorme para uma mudança pequena:

- Tamanho compacto e tamanho amplo realmente suportados, incluindo pouca altura quando pertinente.
- Menu/painel aberto, seleção e foco visíveis.
- Conteúdo longo, vazio, erro e processamento quando o fluxo os possui.
- Teclado virtual, rolagem, áreas seguras e controles fixos quando aplicáveis.
- Entradas suportadas e retorno de foco/contexto após fechar ou voltar.

## Combinar evidências

| Evidência | O que ajuda a verificar | O que ainda precisa de outra verificação |
| --- | --- | --- |
| Screenshot | Composição, conteúdo visível, cortes, sobreposição e aparência naquele estado | Cliques, persistência, semântica e resposta em outros estados |
| Árvore de UI/DOM | Estrutura, rótulos, estados e relações disponíveis na ferramenta | Aparência renderizada e adequação do caminho completo |
| Teste de comportamento | Operações e resultados cobertos pelo teste | Aspectos fora dos cenários e aparência não observada |
| Aplicação em execução | Comportamento e feedback das ações percorridas | Plataformas, dados e entradas não exercitados |
| Build ou análise estática | Compatibilidade/erros alcançados por essa etapa | Aprovação visual e usabilidade |

Comparar antes e depois com estado, dados, escala e tamanho equivalentes. Diferença de pixels pode revelar regressão, mas não julga se a organização ajuda a tarefa. Inspeção visual não substitui testes de acesso, dados ou semântica. Não inferir contraste numérico apenas pelo olho; usar valores e ferramentas apropriados quando o critério exige cálculo.

Registrar achados específicos: "a ação Aplicar fica coberta pelo painel inferior nesta altura" permite corrigir e repetir o cenário. "Parece pouco profissional" precisa ser transformado numa observação e numa hipótese antes de orientar mudança.

## Quando não há acesso visual

Continuar o trabalho independente: revisar estrutura, regras de layout, conteúdo, semântica, constraints, estados e testes disponíveis. Usar decisões conservadoras e padrões adequados à plataforma. Se houver screenshot fornecida, ela permite avaliar somente o estado capturado; um teste com DOM simulado não comprova renderização num navegador.

Registrar quais telas e condições ainda precisam de inspeção e como fazê-la. Não fingir ter aberto um app, visto uma screenshot ou testado um controle real. Não forçar mudança de tecnologia, instalação global ou serviço externo apenas para ocultar essa limitação. Solicitar ao usuário só a informação ou ação indispensável, após concluir o trabalho já autorizado e independente.

## Encerrar com limites claros

Repetir verificações afetadas após a correção; ampliar a cobertura apenas quando houver mudança, falha ou risco concreto que justifique. Encerrar quando os critérios relevantes estiverem atendidos e os limites registrados, sem polimento infinito por preferência pessoal.

Registrar estado, ambiente, observação, correção e resultado em `docs/verificacao.md` ou no [modelo opcional](../assets/templates/inspecao-ui.md). Informar separadamente o que foi implementado, executado, observado visualmente e ficou pendente. Não prometer ausência de defeitos ou domínio universal de UI.

Fonte de ferramenta: [capturas no Playwright](https://playwright.dev/docs/screenshots). Usar documentação equivalente da plataforma/engine escolhida e a versão das ferramentas realmente disponíveis.
