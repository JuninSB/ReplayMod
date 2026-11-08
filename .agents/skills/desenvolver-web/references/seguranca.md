# Segurança proporcional ao produto

## Índice

- Mapa de risco
- Identidade e autorização
- Entrada e saída
- Segredos e dependências
- Dados, privacidade e operação

## Mapa de risco

Identificar dados protegidos, atores, pontos de entrada, efeitos irreversíveis e fronteiras de confiança. Usar [OWASP ASVS](https://cheatsheetseries.owasp.org/IndexASVS) e os cheat sheets como referências de verificação. Não declarar conformidade com ASVS por seguir uma lista parcial.

Uma landing sem coleta não precisa de autenticação artificial. Um painel multiusuário precisa de autorização real. Propor controles pelo risco presente, sem adicionar um checklist burocrático à interface do usuário.

## Identidade e autorização

Preferir biblioteca ou provedor mantido em vez de criptografia e login caseiros. Verificar compatibilidade, fluxos de recuperação, revogação e configuração real. Se usar senha local, usar algoritmo e parâmetros recomendados por biblioteca atual; nunca armazenar texto puro ou hash rápido sem proteção adequada.

Validar autorização em toda leitura e escrita protegida, incluindo listagem, exportação, upload, jobs, download e atualização parcial. Negar por padrão. Conferir usuário, organização, recurso e operação. `userId` vindo do cliente não é identidade; ocultar botão não é autorização.

Testar com duas contas ou dois tenants. Tentar trocar identificador no caminho, query e body. Garantir que cache e consultas respeitem o mesmo escopo. Não retornar campos sensíveis só porque a consulta os carregou.

Para sessão em cookie, usar HTTPS e atributos `Secure`, `HttpOnly` e `SameSite` apropriados ao fluxo. Em desenvolvimento local, adaptar com cuidado e nunca levar configuração insegura à produção. Rotacionar/revogar sessões quando necessário; logout precisa invalidar o mecanismo aplicável.

Aplicar proteção CSRF nas mutações autenticadas por cookies conforme o framework e a arquitetura. SameSite ajuda, mas não resolve todo caso sozinho. Avaliar tokens e validação de origem conforme orientação atual. Não usar GET para mutações. CORS não substitui autenticação, autorização nem controle de CSRF.

## Entrada e saída

Validar formato, tamanho, cardinalidade e domínio dos valores no servidor. Usar queries parametrizadas. Normalizar onde o domínio exige sem alterar dados de modo surpreendente. Proteger ordenação e nomes de coluna com lista permitida.

Usar escape por contexto e renderização segura. Tratar HTML rico com sanitização apropriada; revisar `innerHTML` e `dangerouslySetInnerHTML`. Não considerar CSP como substituta de correção de XSS. Construir CSP compatível com a stack e testar antes de endurecer.

Em uploads, limitar tamanho e quantidade, verificar tipo pelo conteúdo quando necessário, não confiar em extensão/MIME do navegador, gerar nomes seguros e evitar execução. Armazenar arquivos privados fora de área pública e verificar acesso em cada download. Defender paths contra traversal.

Quando servidor consulta URLs influenciadas pelo usuário, avaliar SSRF, destinos internos, redirects, DNS e limites. Não criar proxy genérico sem controles. Redirecionamentos após login precisam de destinos permitidos.

Aplicar limites de taxa e abuso em pontos expostos relevantes, com chave adequada e configuração correta de proxy confiável. Evitar bloquear toda uma rede compartilhada sem avaliar impacto. Definir timeouts e limites de body e paginação.

## Segredos e dependências

Guardar segredos no ambiente/secret store do servidor. Nunca enviá-los no bundle, HTML, logs, screenshots, respostas ou `contexto.md`. Variáveis com prefixos públicos de bundlers são públicas; não usá-las para segredo. `.env.example` deve conter nomes e valores fictícios claramente seguros.

Manter `.env` real fora do Git. Se um segredo vazou, remover do arquivo não basta: revogar/rotacionar e tratar histórico conforme o caso. Não exibir valor em relatórios. Conferir diffs e artefatos antes de publicar.

Adicionar dependências com finalidade, manutenção, compatibilidade e licença verificadas. Fixar lockfile e revisar alertas de vulnerabilidade pelo alcance real. Não executar `audit fix --force` sem entender mudanças. Não baixar scripts desconhecidos e executá-los por conveniência.

## Dados, privacidade e operação

Coletar o mínimo necessário. Definir retenção, acesso, exclusão, logs e backups. Uma política de privacidade deve refletir práticas reais; não inventar provedor, prazo, base jurídica ou promessa de segurança. Verificar requisitos legais atuais com fontes oficiais quando o projeto exigir. O pacote não contém parecer jurídico universal.

Separar ambientes e credenciais. Testar falha de integração sem dados reais. Preparar backups, restauração, rollback e monitoramento proporcionais. Não fazer operações destrutivas em produção sem autorização aplicável.

Referências: [Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), [Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet), [CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [OWASP Cheat Sheet Series](https://owasp.org/projects/cheat-sheet-series). Conferir guias específicos para XSS, SQL, upload, SSRF e senhas antes de implementar essas superfícies.
