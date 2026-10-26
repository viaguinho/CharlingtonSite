/**
 * Como a medicação se chama na tela: o princípio ativo e, entre parênteses, a marca
 * registrada quando ela existe e é outra coisa. A família reconhece o remédio pela marca.
 */
export function medicationLabel(medication) {
  const active = String(medication.principioAtivo ?? '').trim();
  const brand = String(medication.nome ?? '').trim();
  if (!active) return brand;
  return brand && brand.toLowerCase() !== active.toLowerCase() ? `${active} (${brand})` : active;
}
