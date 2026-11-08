# Identidade e sistema visual

## Índice

- Contrato visual
- Composição
- Tokens e componentes
- Personalidade
- Refinamento

## Contrato visual

Definir direção antes de importar um kit de landing. Registrar em `docs/design.md`:

| Decisão | Conteúdo |
| --- | --- |
| Personalidade | Dois ou três atributos com consequências práticas |
| Contexto | Uso diário, leitura, consulta técnica ou exploração |
| Tipografia | Família, licença, fallback, pesos usados e escala |
| Cor | Texto, fundo, superfícies, borda, ação, foco e estados |
| Densidade | Espaço e altura de controles por situação |
| Geometria | Raios, bordas, alinhamento e elevação |
| Ícones | Uma família, tamanho, peso e rótulos |
| Movimento | Informação transmitida e alternativa reduzida |
| Conteúdo | Título, dado longo, vazio, erro e sucesso reais |

Converter adjetivos em decisões. "Calmo" pode significar superfícies estáveis, pouco ruído e movimento contido. "Preciso" pode significar números alinhados, unidades visíveis e verbos específicos. Não criar cinco adjetivos sem consequência no código.

## Composição

Organizar por importância e tarefa. Título, explicação, demonstração e ação devem formar uma sequência compreensível. Não impor hero centralizado, três cards e três preços a qualquer assunto.

Usar largura confortável para texto e espaço que mostre relações. Não aumentar todo padding para parecer premium. Uma lista operacional pede densidade diferente de uma página editorial. Tabela serve comparação por colunas; cards servem objetos heterogêneos. Não converter qualquer tabela em cards só por estética.

Escolher breakpoints quando o conteúdo exige mudança. Testar menu, nomes longos, datas e tabelas em telas estreitas. Hierarquia deve funcionar por tamanho, peso, posição e espaço antes de adicionar cores. Reservar acento para ações e informações relevantes; não depender só da cor.

## Tokens e componentes

Separar papéis visuais de valores de marca. Usar `--action` em vez de espalhar uma cor bruta. Exemplo original para discutir papéis, não identidade padrão:

```css
:root {
  --canvas: #f6f6f3;
  --surface: #ffffff;
  --text: #202521;
  --text-muted: #526058;
  --border: #d7ded8;
  --action: #215846;
  --action-text: #ffffff;
  --focus: #1859a9;
  --radius-control: .375rem;
  --radius-panel: .625rem;
  --space-1: .25rem;
  --space-2: .5rem;
  --space-3: .75rem;
  --space-4: 1rem;
}
```

Adaptar ao produto e verificar combinações realmente usadas, incluindo hover, foco, erro e tema escuro. Uma paleta isolada não comprova acessibilidade.

Criar componentes para preservar comportamento ou consistência: campo com mensagem, botão pendente, diálogo, navegação ou tabela paginada. Preferir composição a um componente universal com trinta flags. Usar variantes pequenas e compreensíveis. Não adicionar wrapper que só renomeia duas classes sem benefício.

## Personalidade

Fazer poucas escolhas memoráveis sustentadas pelo produto. Uma ferramenta técnica pode usar listas densas, metadados precisos e demonstração concreta. Um serviço editorial pode destacar tipografia e ritmo de leitura. Um painel de operação pode priorizar filas, estados e histórico.

Usar ilustração ou animação quando explica algo. Orbes, brilhos, texturas e screenshots inclinadas sem relação com a tarefa são candidatos à remoção. Gradiente de marca e grade de pontos são válidos com propósito e leitura preservada.

Não retirar Inter, Lucide ou cantos suaves só para parecer original. A identidade vem de conteúdo, composição, ritmo e comportamento. Repetir o sistema de forma consistente entre páginas é uma qualidade.

## Refinamento

Inserir conteúdo representativo, resolver hierarquia, aplicar tokens e implementar estados. Observar em tamanhos reais e identificar problemas específicos. Corrigir o sistema quando a falha se repete em várias telas. Revisar tipografia, alinhamentos, densidade, contraste, foco, overflow, toque e assets. Screenshots ajudam comparação; testar o fluxo continua necessário.

Para selecionar padrões e priorizar decisões, consultar [julgamento de UI](julgamento-ui.md). Para conferir a implementação, seguir [inspeção visual](inspecao-visual.md); para múltiplos formatos e entradas, consultar [adaptação](adaptacao-mobile-desktop.md). Manter a direção revisável e registrar evidência das mudanças, sem transformar um gosto de aparência em regra universal.

Base: [Primer foundations](https://primer.style/product/getting-started/foundations/), [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/), [Tailwind theme variables](https://tailwindcss.com/docs/theme). A composição recomendada aqui é uma síntese editorial, não regra oficial dessas marcas.
