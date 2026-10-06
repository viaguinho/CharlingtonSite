import letterheadCampinas from '../../../assets/Papel - Campinas.jpg';

/**
 * Folha A4 timbrada — o preview imutável do documento.
 *
 * ════════════════════════════════════════════════════════════════════════
 *  COMPONENTE HERDADO. A geometria abaixo vem do painel anterior e foi
 *  calibrada contra o papel timbrado impresso da clínica. Não altere sem
 *  conferir com uma impressão real:
 *
 *    proporção  1 / 1.41  (A4)
 *    margens    140px topo · 45px direita · 110px base · 60px esquerda
 *    camadas    timbrado z-index 1 · conteúdo z-index 2
 *
 *  As margens generosas do topo e da base existem porque o timbrado já traz
 *  cabeçalho e rodapé impressos: o conteúdo precisa cair entre eles.
 * ════════════════════════════════════════════════════════════════════════
 *
 * O que mudou em relação ao original: os estilos saíram do atributo `style`
 * para classes CSS (a política de segurança do painel não permite estilo
 * inline), o timbrado passou a ser selecionável por unidade, e o bloco de
 * assinatura ganhou número sequencial e QR de verificação.
 */

export const LETTERHEADS = {
  campinas: { src: letterheadCampinas, label: 'Campinas / SP' },
  // Fortaleza usa o timbrado de Campinas até que o arquivo próprio seja
  // enviado em Configurações › Identidade da clínica.
  fortaleza: { src: letterheadCampinas, label: 'Fortaleza / CE' },
};

export function LetterheadPreview({
  plaza = 'campinas',
  letterheadSrc,
  patientName,
  patientBirth,
  guardianName,
  documentTitle,
  documentSubtitle,
  content,
  items,
  doctorName,
  doctorCRM,
  issuedAt,
  number,
  signature,
  verificationUrl,
  copyLabel,
  buyerBlock,
}) {
  const src = letterheadSrc ?? LETTERHEADS[plaza]?.src ?? letterheadCampinas;

  return (
    <div className="sheet-a4" role="document" aria-label="Pré-visualização do documento">
      <img className="sheet-a4__letterhead" src={src} alt="" aria-hidden="true" />

      <div className="sheet-a4__inner">
        {copyLabel ? <span className="sheet-a4__copy">{copyLabel}</span> : null}

        {/* ——— Faixa de identificação do paciente ——— */}
        <div className="sheet-a4__patient">
          <span><strong>Paciente:</strong> {patientName || '—'}</span>
          {patientBirth ? <span><strong>Nasc.:</strong> {patientBirth}</span> : null}
          <span><strong>Data:</strong> {issuedAt || '—'}</span>
        </div>

        {guardianName ? (
          <div className="sheet-a4__guardian">
            <strong>Responsável:</strong> {guardianName}
          </div>
        ) : null}

        {/* ——— Corpo ——— */}
        <div className="sheet-a4__main">
          <h3 className="sheet-a4__title">
            {documentTitle}
            {number ? <span className="sheet-a4__number num">nº {number}</span> : null}
          </h3>
          {documentSubtitle ? <p className="sheet-a4__subtitle">{documentSubtitle}</p> : null}

          {content ? <div className="sheet-a4__content">{content}</div> : null}

          {items?.length ? (
            <ol className="sheet-a4__items">
              {items.map((item, index) => (
                <li key={index}>
                  <span className="sheet-a4__item-name">
                    {item.principio}
                    {item.concentracao ? ` — ${item.concentracao}` : ''}
                    {item.forma ? ` (${item.forma})` : ''}
                  </span>
                  <span className="sheet-a4__item-dose">{item.posologia}</span>
                  {item.quantidade ? <span className="sheet-a4__item-qty">{item.quantidade}</span> : null}
                </li>
              ))}
            </ol>
          ) : null}

          {!content && !items?.length ? (
            <p className="sheet-a4__placeholder">
              O texto digitado à esquerda aparece aqui, exatamente como será impresso.
            </p>
          ) : null}
        </div>

        {/* ——— Identificação do comprador (receituário de controle especial) ——— */}
        {buyerBlock ? (
          <div className="sheet-a4__buyer">
            <span className="sheet-a4__buyer-title">Identificação do comprador</span>
            <div className="sheet-a4__buyer-lines">
              <span>Nome: ______________________________________________</span>
              <span>RG / órgão emissor: _________________________________</span>
              <span>Endereço: __________________________________________</span>
              <span>Telefone: ___________________________________________</span>
            </div>
            <span className="sheet-a4__buyer-title">Identificação do fornecedor</span>
            <div className="sheet-a4__buyer-lines">
              <span>Farmácia: ___________________________________________</span>
              <span>Data: ____/____/______   Assinatura: ________________</span>
            </div>
          </div>
        ) : null}

        {/* ——— Assinatura ——— */}
        <div className="sheet-a4__signature">
          <span className="sheet-a4__rule" aria-hidden="true" />
          <strong>{doctorName || 'Dr. Charlington M. Cavalcante'}</strong>
          {doctorCRM ? <span className="sheet-a4__crm">Neurologia infantil · CRM {doctorCRM}</span> : null}

          {signature ? (
            <>
              <span className="sheet-a4__seal">
                Assinado digitalmente via {signature.provedor} · {signature.id}
              </span>
              {verificationUrl ? (
                <span className="sheet-a4__verify">
                  Verifique em {verificationUrl}
                </span>
              ) : null}
            </>
          ) : (
            <span className="sheet-a4__seal sheet-a4__seal--pending">
              Aguardando assinatura digital
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default LetterheadPreview;
