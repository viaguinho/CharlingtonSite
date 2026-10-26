import Icon from '../../../components/Icon.jsx';
import { declaredAllergies, allergyHits } from './allergyConflict.js';

/**
 * Faixa de alergia no topo dos modais clínicos abertos a partir do prontuário
 * (prescrição, medicação, evolução, escala, remarcação). O modal cobre a página
 * e as pílulas de alerta somem por trás dele, justo na hora em que mais importa
 * (guia §0.6). Se o que se digita bate com uma alergia declarada, o aviso diz.
 *
 * `hint` completa a frase quando não há alergia ("Confirme com o responsável
 * antes de prescrever."); sem ele, só o fato.
 */
export function AllergyNotice({ patient, allergies, typed = '', hint = null, className = '' }) {
  const declared = declaredAllergies(allergies ?? patient?.clinico?.alergias ?? []);
  const hits = String(typed).trim() ? allergyHits(typed, declared) : [];
  if (!declared.length) {
    return (
      <p className={`pr-rx-allergy is-none ${className}`.trim()} role="note">
        <Icon name="info" size={16} />
        <span><strong>Nenhuma alergia registrada.</strong>{hint ? ` ${hint}` : null}</span>
      </p>
    );
  }
  return (
    <p className={`pr-rx-allergy ${className}`.trim()} role="note">
      <Icon name="alert-triangle" size={16} />
      <span>
        <strong>Alergias: {declared.join(' · ')}</strong>
        {hits.length ? <span className="pr-rx-allergy__hit" role="alert">O que foi digitado contém {hits.join(', ')}: confirme antes de registrar.</span> : null}
        {String(typed).trim() && !hits.length ? <span className="pr-rx-allergy__caveat">Sem correspondência automática. A checagem só reconhece nomes e marcas conhecidos: confira o medicamento.</span> : null}
      </span>
    </p>
  );
}
