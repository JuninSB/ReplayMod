# Interfaces nativas e multiplataforma

## Índice

- Escolher tecnologia pelo destino
- Convenções de desktop e celular
- Configurações e navegação
- Estado, integração e acessibilidade
- Verificação e entrega

## Escolher tecnologia pelo destino

Considerar sistema operacional, distribuição, experiência da equipe, requisitos de desempenho, acessibilidade e recursos nativos. Preservar a base existente. Um app pode ser nativo ou multiplataforma sem incluir navegador embutido nem backend web. Serviços externos só entram quando o produto realmente necessita deles.

| Contexto | Opções a pesquisar conforme projeto |
| --- | --- |
| Android | Kotlin e Jetpack Compose ou UI existente |
| iOS/macOS | Swift e SwiftUI ou UI existente |
| Windows | C#/C++ e WinUI ou outra tecnologia já usada |
| Desktop multiplataforma | Qt/QML e C++, Flutter/Dart ou alternativa apropriada |
| Jogos | Sistema de UI da engine e linguagem do projeto |
| Rust ou outra linguagem | Toolkit compatível com plataforma, necessidades e experiência da equipe |

São opções, não uma lista obrigatória. Verificar licença, acessibilidade, ferramentas de build e documentação atual. Não converter um app existente para outro toolkit apenas para seguir um exemplo.

## Convenções de desktop e celular

Usar padrões familiares quando ajudam: barra lateral, menu contextual, abas, painéis, voltar, atalhos e diálogos próprios da plataforma. Considerar cursor, teclado, toque, tamanhos de janela, rotação, áreas seguras, densidade de tela e fontes do sistema conforme o destino.

No celular, permitir que o teclado virtual abra sem cobrir o campo ou a ação principal; apoiar voltar e fechar de maneira previsível. No desktop, testar redimensionamento, atalhos relevantes, navegação por teclado, foco de janela e menus contextuais. Não forçar o mesmo layout em uma tela estreita e em uma janela larga.

## Configurações e navegação

Agrupar as opções por assunto, mostrar o valor atual e usar descrição quando o efeito não for óbvio. Uma busca pode ajudar em muitas configurações; categorias continuam disponíveis. Usar abas, listas ou navegação lateral conforme quantidade de conteúdo e plataforma.

Um menu de item deve conter ações que atuam naquele item. Uma ação de exclusão precisa explicar seu efeito e tratar recuperação ou confirmação conforme o caso. Manter posição, seleção ou rascunho ao retornar quando isso ajuda a pessoa.

## Estado, integração e acessibilidade

Implementar operações usando as APIs da plataforma e o armazenamento adequado ao tipo de dado. Tratar permissões do sistema, falhas, cancelamento e estados vazios. Proteger informações privadas e evitar credenciais em logs ou arquivos públicos.

Oferecer nomes acessíveis, hierarquia semântica, foco visível e navegação por entradas suportadas. Respeitar escala de fonte, tema, idioma e preferências de acessibilidade quando a plataforma oferecer esses recursos. Em interfaces customizadas, testar que o comportamento continua utilizável com tecnologias assistivas quando disponíveis.

## Verificação e entrega

Executar build e testes apropriados ao projeto, testar ações e persistência, inspecionar a UI em tamanhos e dispositivos relevantes e verificar a integração com o sistema. Dizer se a inspeção ocorreu em dispositivo real, emulador, simulador ou se não foi possível fazê-la. Não afirmar compatibilidade com plataformas não testadas.

Seguir [inspeção visual](inspecao-visual.md) e [adaptação](adaptacao-mobile-desktop.md). Usar a aplicação e ferramentas da plataforma quando disponíveis; não converter a UI para web para produzir uma imagem. Registrar área lógica disponível e entradas conhecidas, sem tomar pixels da captura como unidades do layout.

Referências: [Jetpack Compose](https://developer.android.com/develop/ui/compose), [Flutter UI](https://docs.flutter.dev/ui), [WinUI](https://learn.microsoft.com/en-us/windows/apps/winui/), [Qt Quick](https://doc.qt.io/qt-6/qtquick-index.html), [Android settings](https://developer.android.com/design/ui/mobile/guides/patterns/settings), [Windows settings](https://learn.microsoft.com/en-us/windows/apps/design/app-settings/guidelines-for-app-settings), [Apple settings](https://developer.apple.com/design/human-interface-guidelines/settings). Consultar as versões e guias específicos da plataforma.
