# Como Colocar o Site do Dr. Charlington no Ar 🚀

Este é um guia passo a passo simples e prático para ajudá-lo a publicar o site e configurá-lo no seu próprio domínio sempre que precisar realizar atualizações ou colocá-lo no ar pela primeira vez.

Como o site é **estático** (composto por arquivos puros de `HTML`, `CSS`, `JS` e a pasta de `assets`), ele não precisa de bancos de dados complexos ou servidores especiais. Isso torna a hospedagem extremamente rápida, segura e barata (ou até mesmo gratuita).

---

## 📋 1. Preparação (Checklist antes de subir)

Antes de fazer o upload, certifique-se de que os arquivos estão organizados:
1. **Verifique os Arquivos:** Você deve publicar apenas o conteúdo de dentro da pasta **`CharlingtonSite`**:
   - `index.html` (Página principal)
   - `updates.html` (Página de atualizações/novidades)
   - `styles.css` (Estilos visuais)
   - `script.js` (Lógica e interações)
   - `assets/` (Pasta contendo imagens, logo e ícones)
2. **Evite Arquivos Extras:** Pastas como "Arquivos dev" ou arquivos soltos que não fazem parte do site final não devem ser enviados para a hospedagem de produção.

---

## 🛠️ 2. Escolha o Método de Publicação

Escolha uma das opções abaixo de acordo com a sua preferência:

### Opção A: Vercel ou Netlify (Recomendado - Grátis, Rápido e Moderno)
Essas plataformas são ideais para sites estáticos. O carregamento é ultra-rápido mundialmente e o certificado de segurança SSL (HTTPS) é gerado automaticamente de forma gratuita.

#### Publicação por "Arrastar e Soltar" (Sem código):
1. Acesse o site da **[Netlify](https://www.netlify.com/)** ou **[Vercel](https://vercel.com/)** e crie uma conta gratuita.
2. No painel de controle, vá na aba de sites e procure por **"Deploy manually"** ou **"Drag and drop your site folder"**.
3. **Arraste e solte a pasta `CharlingtonSite`** inteira para dentro da área pontilhada na página.
4. Pronto! O site estará no ar instantaneamente em um link provisório fornecido por eles (ex: `charlington.netlify.app`).

#### Publicação Integrada com o GitHub:
Se você utiliza controle de versão, pode criar um repositório no **GitHub**, subir os arquivos para lá e conectar a Vercel/Netlify a esse repositório. Toda vez que você atualizar o código e enviar para o GitHub, o site atualizará na internet automaticamente.

---

### Opção B: Hospedagem Tradicional cPanel (Hostinger, Hostgator, Locaweb, etc.)
Ideal se você já contratou um serviço de hospedagem que inclui e-mails profissionais (ex: `contato@drcharlington.com.br`).

1. Entre no painel de administração da sua hospedagem (ex: **cPanel** ou painel próprio da **Hostinger**).
2. Localize e abra o **Gerenciador de Arquivos** (File Manager).
3. Vá para o diretório raiz do site, que quase sempre se chama **`public_html`**.
4. No seu computador, entre na pasta `CharlingtonSite`, selecione todos os arquivos de dentro dela e **compacte-os em um arquivo `.zip`** (o `index.html` deve ficar na raiz do arquivo zipado, e não dentro de pastas extras).
5. Faça o upload do arquivo `.zip` para a pasta `public_html`.
6. Clique com o botão direito no arquivo `.zip` carregado no servidor e selecione **"Extrair"** (Extract).
7. Apague o arquivo `.zip` do servidor para manter a pasta limpa.

---

## 🌐 3. Configuração do Domínio Próprio (Ex: `drcharlington.com.br`)

Depois de publicar o site em um dos serviços acima, você precisará conectar o seu domínio próprio para que as pessoas o acessem facilmente.

1. **Compre o Domínio:** Se ainda não tiver um domínio, compre no **[Registro.br](https://registro.br/)** (para domínios nacionais `.br`) ou em registradoras como GoDaddy ou Hostinger.
2. **Aponte os Servidores DNS:**
   - **Se usou Vercel/Netlify:** Adicione o seu domínio personalizado nas configurações de domínio da plataforma. Eles fornecerão os **Name Servers** (ex: `ns1.netlify.com`, `ns2.netlify.com`). Acesse o site onde você comprou o domínio e altere os servidores DNS para os indicados pela plataforma.
   - **Se usou Hospedagem Tradicional:** A sua empresa de hospedagem fornece os Name Servers específicos no e-mail de contratação ou no painel. Configure-os na registradora do domínio.
3. **Aguarde a Propagação:** Esse processo de atualização dos servidores de internet (propagação DNS) costuma levar de **2 a 24 horas** para funcionar completamente em todos os dispositivos.

---

## 🩺 4. Checklist Pós-Publicação

Assim que o site estiver acessível através do domínio definitivo, execute os seguintes testes:
* [ ] **HTTPS ativo:** Verifique se há o cadeado de segurança ao lado da URL na barra de endereços (o site deve abrir com `https://`).
* [ ] **Botão do WhatsApp:** Clique no botão de agendamento e verifique se ele abre o aplicativo do WhatsApp com a mensagem pré-configurada corretamente.
* [ ] **Navegação Geral:** Clique nos links do menu para ver se rola suavemente para as seções corretas.
* [ ] **Página de Novidades:** Vá para `updates.html` e certifique-se de que ela abre corretamente e que os estilos visuais são aplicados.
* [ ] **Experiência Mobile:** Abra o site no celular para garantir que o menu hambúrguer, o espaçamento das seções e as imagens estão adaptadas e com excelente leitura.

---

*Documento criado em maio de 2026 para auxílio na manutenção do projeto do Dr. Charlington.*
