# Implementação e entrega

## Índice

- Entrada
- Fluxo
- Critérios de pronto
- Comunicação

## Entrada

Ler instruções, contexto, manifestos, lockfile, ambiente, rotas e testes. Observar Git sem modificar alterações alheias. Reproduzir problema quando possível. Distinguir falhas preexistentes das introduzidas. Não atualizar dependências para fazer ajuste simples nem trocar gerenciador de pacotes sem causa.

## Fluxo

Definir resultado e aceite; inspecionar código; implementar menor mudança coerente ou fatia completa; verificar; corrigir; fazer autorrevisão separada; atualizar contexto e entregar. Manter plano curto quando necessário. Documentação serve quem chega depois, não precisa transcrever toda conversa.

Se o usuário pedir protótipo explicitamente, respeitar o escopo e identificar limites. Caso contrário, tratar fluxos pedidos como funcionais. Não reduzir escopo silenciosamente para encerrar mais cedo.

## Critérios de pronto

| Camada | Evidência aplicável |
| --- | --- |
| Produto | Aceite reproduzível e ações rastreadas |
| Interface | Rotas e controles conectados, estados reais, layout inspecionado |
| Backend | Contratos validados, autorização e persistência verificadas |
| Dados | Migrações reproduzíveis e recuperação documentada |
| Qualidade | Tipos/lint/build e testes afetados executados |
| Segurança | Entradas e acesso revisados, segredos fora do cliente |
| Desempenho | Medição antes/depois quando há otimização |
| Continuidade | Contexto e documentos relevantes atualizados |
| Operação | Configuração, deploy e rollback quando pedidos |

Marcar "não se aplica" com motivo, sem requisitos artificiais para página estática. Falha de ambiente não é teste aprovado. Compilação não comprova integração; HTTP 200 não comprova efeito persistente.

Se faltar integração essencial, concluir partes independentes e informar bloqueio e próximo passo. Não substituir efeito real por sucesso artificial.

## Comunicação

Apresentar resultado primeiro, depois validação e limites. Distinguir implementado, testado localmente, publicado e bloqueado. Não afirmar métricas, cobertura, segurança ou implantação sem evidência. Descrever comportamento testado: "outra conta recebe acesso negado" é mais útil que apenas "checks verdes".

Se houver autorização para commits, revisar diff e registrar mudanças pequenas. Build aprovado não autoriza publicação por si só. Reaproveitar autorizações e separar preparação local de efeitos externos.
