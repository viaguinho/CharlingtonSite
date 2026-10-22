import { useState } from 'react';
import GlassFolder from '../components/GlassFolder.tsx';

/** Demonstração das pastas de vidro. Não está ligada a nenhuma rota. */
export default function GlassFolderDemo() {
  const [exames, setExames] = useState([
    { name: 'Ressonância de crânio', meta: 'JPG · 2,1 MB', art: 'profundo' },
    { name: 'Tomografia', meta: 'JPG · 1,8 MB', art: 'gelo' },
  ]);
  const [neuro] = useState([
    { name: 'Eletroneuromiografia', meta: 'PDF · 340 KB' },
    { name: 'Laudo de eletroencefalograma', meta: 'PDF · 512 KB' },
    { name: 'Potencial evocado', meta: 'PDF · 288 KB' },
  ]);
  const [lab, setLab] = useState([]);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--gutter)', padding: 'var(--gutter)' }}>
      <GlassFolder
        label="Exames de imagem"
        art="azul"
        files={exames}
        onAdd={() => { setExames((l) => [...l, { name: 'Novo exame', meta: 'Agora', art: 'grafite' }]); }}
      />
      <GlassFolder label="Neurofisiológico" art="profundo" seed={7} files={neuro} action="more"
        menu={[{ label: 'Renomear pasta' }, { label: 'Excluir pasta', danger: true }]} />
      <GlassFolder label="Laboratorial" art="gelo" seed={5} files={lab}
        onAdd={() => { setLab((l) => [...l, { name: 'Hemograma', meta: 'PDF · 120 KB' }]); }} />
    </div>
  );
}
