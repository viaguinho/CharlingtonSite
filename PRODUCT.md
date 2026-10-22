# Product

<!-- impeccable:product-schema 1 -->

> Escrito em 20/10/2026 a partir do registro do projeto (decisões confirmadas pelo dono desde 05/10/2026) e do código. Nenhum fato novo foi inventado; o que está em aberto aparece como tal.

## Platform

web

## Users
- **Dr. Charlington M. Cavalcante**, neuropediatra (CRM-SP 173.176), dono da clínica. Usa o painel antes, durante e depois da consulta, no consultório, muitas vezes com a família da criança na frente da tela.
- **Equipe da clínica** (recepção, administração), com permissões menores: agenda, cadastro, confirmações e financeiro. Ver, editar e emitir dependem do papel (`can.write(...)`).

## Product Purpose
Painel de gestão da clínica de neuropediatria: agenda, pacientes e prontuário eletrônico (evoluções, escalas, marcos do desenvolvimento, medicações, exames, documentos clínicos no papel timbrado, consentimentos LGPD), comunicação, financeiro, relatórios e auditoria. Dá certo quando o médico encontra o que precisa da criança em segundos, sem ruído, e consegue explicar o quadro à família.

## Positioning
O prontuário é de uma clínica pediátrica neurológica: centrado na criança e no responsável, com perfil sensorial, marcos do desenvolvimento e escalas neuropsicológicas como dados de primeira classe, que um prontuário genérico não tem.

## Operating Context
- Desktop no consultório (1280–1920 px) é o uso principal. Notebook a partir de 1024 px e celular para consulta rápida.
- Consulta presencial e teleconsulta. Sala única (sem coluna de recepção).
- Dados locais em IndexedDB com cofre AES-GCM, ou Supabase atrás do mesmo contrato. Anexos são cifrados e nunca guardam o nome original.

## Capabilities and Constraints
- React 19 + Vite (MPA, HashRouter) em `admin/`. CSS puro com tokens (`admin/styles/tokens.css` é a única fonte de cor); o admin não usa Tailwind. `three@0.185` e `framer-motion` estão instalados.
- O menu vertical (dock) é desenho manual do dono e não pode ser tocado.
- Dados sempre reais: nada fictício na interface. A base de demonstração existe só em dev, é removível e sai do código na finalização.
- Alergias nunca podem sumir conforme a largura da janela.
- "Nenhuma medicação registrada" não significa "sem medicação": a frase pede confirmação ao responsável.

## Brand Commitments
- Tema claro. Urbanist no painel inteiro (Inter de reserva). Neutro + um único acento azul (`#0071e3` / `--blue-*`). Roxo e índigo foram rejeitados.
- Vermelho, verde e âmbar só como sinal (erro, sucesso, alerta). **Exceção registrada em 20/10/2026:** no modelo anatômico do prontuário, cada estrutura acende na sua cor anatômica, puxada da paleta.
- Papel timbrado por unidade para documentos clínicos.

## Evidence on Hand
- Pacientes, responsáveis, atendimentos, evoluções, escalas (instrumento, escore/escore máximo, interpretação, risco), marcos, medicações, anexos por origem (imagem, neurofisiológico, laboratorial, genético, pareceres TO/fono/psi, escolar), documentos e consentimentos: tudo em `admin/data/schema.js`.
- Não existem peso, altura, perímetro cefálico nem localização anatômica de achados. Não fabricar.

## Product Principles
1. A criança primeiro: o que importa na consulta fica à vista sem procurar.
2. Dizer o que o sistema sabe, não o que supõe.
3. Toda ação visível funciona de verdade.
4. Calma clínica: pouco ruído, um acento, hierarquia por peso e tamanho.

## Accessibility & Inclusion
WCAG AA no painel: texto ≥ 4,5:1 sobre o pior fundo medido (canvas `#eef0f3`), marcas de dado ≥ 3:1, foco visível, teclado completo, respeito a `prefers-reduced-motion`.
