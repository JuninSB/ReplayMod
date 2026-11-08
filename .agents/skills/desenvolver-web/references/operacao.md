# Git, automação e operação

## Índice

- Git
- Ambiente e comandos
- CI e deploy
- Recuperação

## Git

Inspecionar se existe repositório e alterações atuais. Se não houver, perguntar uma vez sobre criar repositório local e usar commits. Continuar trabalho independente enquanto aguarda; sem autorização ou resposta, não inicializar. Se já estiver autorizado na conversa, não perguntar novamente.

Repositório remoto, compartilhamento e publicação são decisões separadas. Não criar remoto público para guardar código sem pedido. Em repo existente, seguir política de branches e commits. Não resetar, sobrescrever, descartar ou atribuir a si alterações de outras pessoas.

Se commits estiverem autorizados, revisar diff e agrupar por intenção. Usar título curto e específico: `Add invite expiry checks`, por exemplo. Convenção formal de commit é opcional conforme o projeto. Evitar `update`, `fix everything`, commits com segredos e `git add .` sem inspeção.

Nunca fazer force push ou reescrever histórico compartilhado sem autorização específica. Não misturar atualização ampla de dependências e mudança de produto sem necessidade.

## Ambiente e comandos

Declarar runtime suportado, gerenciador e lockfile. Usar um gerenciador principal por workspace e comandos reproduzíveis. Scripts devem executar operações reais e falhar quando a etapa falha. Não criar `test` que apenas imprime sucesso.

Documentar diretório de execução, configuração e variáveis por nome. Separar público de secreto e teste de produção. Validar configuração no início. Evitar dependências globais desnecessárias. Scripts úteis devem ser portáveis ou explicar claramente o shell exigido.

Usar `.gitignore` e configuração de empacotamento com revisão. Distinguir ignorar arquivo no Git de impedir que seja enviado numa imagem/container ou build. Secrets, uploads privados e bancos locais exigem limites próprios.

## CI e deploy

Usar pipeline existente ou criar sequência mínima quando no escopo: instalar pelo lockfile, checar tipos/lint conforme stack, executar testes relevantes e gerar build. Usar ambientes isolados e permissões mínimas. Não colocar credenciais de produção em logs ou artifacts.

Escolher hospedagem por runtime, rede, volumes, banco, jobs e orçamento. Confirmar o que persiste entre deploys. Build estático não fornece API de servidor por si só; função serverless não garante filesystem durável. Explicar a configuração real necessária.

Antes de publicar, verificar comando de início, migrações, ambiente, health checks apropriados, headers, domínios e recuperação. Usar autorização já dada; se faltar autorização para a ação externa, deixar o resultado concreto e revisável antes de solicitar a decisão final.

Após deploy autorizado, observar status e testar fluxo no ambiente alvo. Não declarar publicação pelo simples envio de um comando. Distinguir deploy bem-sucedido de operação de negócio configurada.

## Recuperação

Documentar como voltar uma versão e como lidar com banco já migrado. Migração incompatível pode impedir rollback só do código. Preferir mudanças compatíveis em etapas quando necessário. Backup precisa de procedimento de restore testado; arquivo exportado sem teste não comprova recuperação.

Registrar onde observar erros, duração de requisições e falhas de jobs sem coletar dados excessivos. Proteger acesso a logs e painéis de administração. Não introduzir serviço pago ou monitoramento externo sem avaliar necessidade e autorização.
