# Sistema visual e interação

## Direção

Ferramenta técnica de reprodução: a cena é o conteúdo principal, a biblioteca ajuda a encontrá-la e os controles de transporte ficam imediatamente junto ao quadro. A linguagem usa verbos concretos como **Gravar**, **Enviar**, **Reproduzir** e **Biblioteca**. Não há números, depoimentos ou prévias inventadas.

| Papel               | Decisão atual                                                                 |
| ------------------- | ----------------------------------------------------------------------------- |
| Fundo e superfícies | Graphite `#101318`, `#171c23`, `#202731`                                      |
| Linha               | `#35404d` separa ferramentas e dados                                          |
| Ação e foco         | Mint `#7ce6bd`; estados de erro têm texto além da cor                         |
| Tipografia          | Fonte de sistema; títulos amplos na biblioteca, metadados compactos no viewer |
| Geometria           | Controles de 7 px de raio, painéis de 10 px, bordas visíveis                  |
| Movimento           | Apenas feedback curto; `prefers-reduced-motion` remove animações              |

## Organização por tela

Na biblioteca, as abas **Replays** e **Snapshots** trocam a coleção sem misturar os dois tipos. Ao abrir uma cena, o canvas ocupa a janela inteira; nome e transporte ficam sobre a cena e a sidebar recolhível abriga **Explorer** e **Detalhes**. A timeline adapta sua grade em telas estreitas. A sidebar fecha com Escape, mantém foco previsível e não reduz a área do canvas.

Os botões de toque movem a câmera com alvos de 48 px. Arrastar a cena muda a direção. O Explorer acompanha os `BasePart` e decals disponíveis na captura e atualiza sua árvore ao reproduzir ou buscar no replay; snapshots mostram a árvore do instante capturado. Não representa instâncias que o gravador não salvou. O painel de gravação fica dentro dos limites da tela; um botão percorre 5/10/20/30/60 ticks/s, com aviso em 60. O player oferece pausar/continuar, seek, passos de 5 s, câmera gravada/livre e velocidades de 0,25× a 4×.

O gravador salva propriedades globais de Lighting, Sky, Atmosphere e efeitos suportados; mudanças no tempo viram eventos no replay. O viewer aproxima iluminação, neblina, sombras, céu, Bloom, ColorCorrection e Blur em Three.js. É uma reprodução aproximada, pois o renderer não é a engine Roblox e o replay ainda não guarda skinning/pose facial de Dynamic Heads nem todos os assets do Sky.

O painel do executor é compacto, ignora o inseto superior do Roblox e pode ser arrastado pelo título até o topo da tela. A seleção Snapshot/Replay permanece disponível na barra do viewer; na biblioteca, abas selecionam a coleção.

## Visual verification

Check the viewer at desktop and mobile widths, including portrait and landscape, touch controls, playback states, and empty/error states. A browser screenshot does not replace testing with a Roblox executor or on a physical mobile device.
