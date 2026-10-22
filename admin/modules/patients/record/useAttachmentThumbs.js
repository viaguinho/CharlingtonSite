import { useEffect, useState } from 'react';
import * as repo from '../../../data/repository.js';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Miniaturas reais dos exames em imagem, para as pastas.
 *
 * O arquivo é decifrado só em memória e vira um object URL que vive enquanto
 * a pasta estiver montada — nada vai para cache, disco ou storage aberto.
 * Só carrega quando `enabled` (a pasta entrou na tela). PDF e falha de
 * leitura ficam sem miniatura: a folha vira papel.
 */
export function useAttachmentThumbs(attachments, enabled) {
  const [urls, setUrls] = useState({});

  const ids = attachments.filter((a) => IMAGE_TYPES.has(a.contentType) && a.blobId).map((a) => a.id).join('|');

  useEffect(() => {
    if (!enabled || !ids) return undefined;
    let alive = true;
    const created = [];
    (async () => {
      for (const attachment of attachments) {
        if (!IMAGE_TYPES.has(attachment.contentType) || !attachment.blobId) continue;
        try {
          const buffer = await repo.getBlob(attachment.blobId);
          if (!alive || !buffer) continue;
          const url = URL.createObjectURL(new Blob([buffer], { type: attachment.contentType }));
          created.push(url);
          setUrls((prev) => ({ ...prev, [attachment.id]: url }));
        } catch {
          // Sem miniatura: a folha de papel é a resposta honesta.
        }
      }
    })();
    return () => {
      alive = false;
      created.forEach((url) => URL.revokeObjectURL(url));
      setUrls({});
    };
    // `ids` resume a lista; `attachments` muda de identidade a cada carga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, enabled]);

  return urls;
}
