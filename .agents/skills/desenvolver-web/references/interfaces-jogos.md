# Interface de jogos: menus, HUD e configurações

## Índice

- Estrutura do jogo
- Menu de configurações
- Entradas e foco
- Implementação real
- Multiplayer e desempenho
- Verificação por cenário

## Estrutura do jogo

Identificar engine, plataforma, tamanho de tela, modos de entrada e contexto do jogo antes de escolher a UI. Preservar a engine e a linguagem existentes. Usar os sistemas e componentes da engine ou do projeto; HTML, navegador e Node não são pré-requisitos de uma interface nativa.

Planejar apenas telas necessárias: menu principal, seleção de partida, pausa, HUD, inventário, resultado e configurações podem existir conforme o jogo. Garantir hierarquia, legibilidade durante ação e acesso fácil às tarefas frequentes. Uma UI discreta também precisa comunicar vida, munição, estado da partida ou objetivos quando essas informações forem relevantes.

## Menu de configurações

Para um jogo com volume e variedade suficientes, estruturar seções acessíveis por abas ou navegação lateral, por exemplo:

| Categoria | Controles possíveis quando suportados |
| --- | --- |
| Vídeo ou Gráficos | Resolução suportada, modo de exibição, qualidade ou limite de quadros |
| Áudio | Volume geral, música, efeitos e saída quando disponível |
| Controles | Mapeamento de ações, sensibilidade e opções de controle disponíveis |
| Jogabilidade | Preferências reais que afetam a experiência |
| Acessibilidade | Legendas, tamanho de texto, contraste, redução de movimento e outras opções implementadas |

Não preencher categorias com opções fictícias. Uma configuração de "qualidade" precisa alterar recursos efetivamente suportados; um slider de som precisa alcançar o mixer ou subsistema correto; alteração de tecla precisa mudar a ação e atualizar sua indicação. Mostrar valor atual e distinguir padrão, alteração pendente e indisponibilidade.

Definir aplicar imediatamente ou usar Salvar/Aplicar/Cancelar. Guardar configurações de modo apropriado e restaurá-las no reinício quando o escopo exigir. Validar valores antigos ou corrompidos e adotar fallback seguro. Para resolução/tela cheia, oferecer confirmação com reversão quando houver risco de perder a imagem e a plataforma permitir. Permitir restaurar padrões com consequência clara.

## Entradas e foco

Quando o jogo suporta teclado, controle, mouse ou toque, conectar menus às entradas correspondentes. Dar foco inicial visível, navegação direcional previsível, ação para confirmar e voltar, e retorno de foco ao fechar um diálogo. Um controle desconectado, mudança de modo de entrada ou menu sobreposto não deve deixar a pessoa presa.

Atualizar instruções visíveis quando o dispositivo ou o mapeamento mudar, se essa capacidade fizer parte do projeto. Não assumir que todos os jogadores usam mouse nem depender de hover para mostrar informação essencial. Considerar zonas seguras, escala de interface, janela redimensionável e legibilidade na distância usual de jogo.

Para remapeamento, tratar conflito de teclas, cancelamento, valores padrão e ações essenciais. Não dizer que remapeamento completo existe se só alguns comandos podem mudar. Conferir as capacidades e versões da engine antes de escolher APIs.

## Implementação real

Ligar UI → estado/configuração → subsistema do jogo → persistência e feedback. Exemplos: volume altera o áudio ouvido; sensibilidade altera o processamento de entrada; qualidade altera opções gráficas suportadas. Não satisfazer a tarefa apenas trocando um número mostrado na tela.

Separar apresentação, estado e acesso a áudio, vídeo, entrada ou armazenamento de forma proporcional. Evitar um único arquivo com todas as telas e regras, mas não espalhar uma opção trivial por camadas artificiais. Nomes devem refletir a função do jogo.

## Multiplayer e desempenho

Em jogo online, abrir configurações locais não deve prometer pausar uma partida compartilhada. Diferenciar pausa do menu local de pausa da simulação, conforme regras do jogo. Dados de conta, configurações locais e estado da partida possuem fontes de verdade distintas.

Evitar efeitos de interface que atrapalhem o jogo ou a leitura; respeitar movimento reduzido quando oferecido. Medir custo da UI no hardware alvo antes de otimizar. Manter a navegação responsiva mesmo durante carregamento ou falha de rede; informar estado de conexão de forma honesta quando aplicável.

## Verificação por cenário

Usar a engine, o build e as ferramentas autorizadas para observar o resultado quando disponíveis, seguindo [inspeção visual](inspecao-visual.md). Uma imagem do menu não prova efeito de uma configuração no jogo; um teste de configuração não prova legibilidade ou navegação visual do menu. Registrar os dois tipos de evidência separadamente.

- Abrir menu, alternar categorias, editar e voltar usando entradas suportadas.
- Confirmar que cada alteração produz efeito real no subsistema correspondente.
- Aplicar, cancelar, reiniciar e conferir a persistência exigida.
- Testar perda de foco, controle desconectado e resolução/escala extremas conforme o escopo.
- Testar falha de gravação, configuração inválida e recuperação.
- Em jogo online, conferir que a UI não interrompe a partida de modo enganoso.
- Registrar o que foi testado em engine e dispositivos reais; diferenciar simulação de verificação visual.

Referências: [Godot: navegação por teclado e controle](https://docs.godotengine.org/en/stable/tutorials/ui/gui_navigation.html), [Godot: controles e UI](https://docs.godotengine.org/en/stable/tutorials/ui/index.html), [Unreal CommonUI: entrada](https://dev.epicgames.com/documentation/unreal-engine/commonui-input-technical-guide-for-unreal-engine), [Unreal CommonUI: início](https://dev.epicgames.com/documentation/unreal-engine/common-ui-quickstart-guide-for-unreal-engine), [Microsoft: acessibilidade e remapeamento em jogos](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/metadata-accessibility). Consultar a documentação da versão da engine utilizada.
