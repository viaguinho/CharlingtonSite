import { createContext, useContext, useState } from 'react';
import { useToast } from '../../components/Overlay.jsx';
import { canReschedule } from '../../core/appointments.js';

/**
 * Remarcar arrastando a pílula da consulta.
 *
 * Usado pela Agenda (vistas Dia e Semana) e pelo card da agenda da Visão geral.
 * O arrastar só PROPÕE o novo horário: quem grava é o diálogo de remarcação
 * (`RescheduleDialog`), com o choque de horário, o motivo e a auditoria. Assim
 * arrastar e clicar em "Remarcar" têm exatamente a mesma regra.
 *
 *  - arrasta quem pode ser remarcado (agendado ou confirmado), inclusive a
 *    consulta que já passou sem chegada, que é a que mais precisa de novo dia;
 *  - soltar num dia mantém o horário; soltar numa faixa de hora (vista Dia)
 *    usa a hora da faixa e o quarto de hora sob o cursor;
 *  - horário passado é recusado na hora, com aviso.
 */

const pad = (n) => String(n).padStart(2, '0');

export function useRescheduleDrag({ canWrite, onDragStart } = {}) {
  const toast = useToast();
  const [dragging, setDragging] = useState(null);   // consulta sendo arrastada
  const [dropKey, setDropKey] = useState(null);     // alvo sob o cursor
  const [move, setMove] = useState(null);           // { appointment, start } → abre o diálogo

  const canMove = (a) => !!canWrite && canReschedule(a);

  const dragProps = (a) => (canMove(a) ? {
    draggable: true,
    onDragStart: (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', a.id);
      onDragStart?.(a);
      // Fora do próprio evento: mexer no DOM durante o dragstart cancela o arrasto no Chrome.
      setTimeout(() => setDragging(a), 0);
    },
    onDragEnd: () => { setDragging(null); setDropKey(null); },
  } : {});

  /** `hour` só na vista Dia; sem ele o horário original é mantido. */
  const dropProps = (key, day, hour) => (dragging ? {
    onDragOver: (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dropKey !== key) setDropKey(key);
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setDropKey((k) => (k === key ? null : k));
    },
    onDrop: (e) => {
      e.preventDefault();
      const a = dragging;
      setDragging(null);
      setDropKey(null);
      if (!a) return;
      const old = new Date(a.inicio);
      let hh = old.getHours();
      let mm = old.getMinutes();
      if (hour !== undefined) {
        const box = e.currentTarget.getBoundingClientRect();
        hh = hour;
        // Quarto de hora sob o cursor: a faixa de uma hora vira quatro posições.
        mm = Math.min(3, Math.max(0, Math.floor(((e.clientY - box.top) / Math.max(1, box.height)) * 4))) * 15;
      }
      const start = new Date(`${day}T${pad(hh)}:${pad(mm)}:00`);
      if (start.getTime() === old.getTime()) return;
      if (start.getTime() <= Date.now()) {
        toast.error('Não dá para remarcar para um horário que já passou.');
        return;
      }
      setMove({ appointment: a, start });
    },
  } : {});

  return { dragging, dropKey, move, setMove, canMove, dragProps, dropProps };
}

/** A Agenda entrega o estado de arrasto às vistas Dia e Semana por contexto. */
export const RescheduleDragContext = createContext(null);
export const useRescheduleDragContext = () => useContext(RescheduleDragContext);
