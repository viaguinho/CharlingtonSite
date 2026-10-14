import { useState, useEffect, useRef, useMemo } from 'react';
import { PageHeader } from '../../components/Shell.jsx';
import { Card, CardHeader, CardBody, EmptyState } from '../../components/Card.jsx';
import { Avatar, IconButton, Button, Chip } from '../../components/primitives.jsx';
import { Modal, useToast } from '../../components/Overlay.jsx';
import { TextField, Select, TextArea } from '../../components/Field.jsx';
import Icon from '../../components/Icon.jsx';
import { dateTime, relative } from '../../core/format.js';
import * as repo from '../../data/repository.js';
import { STORES, APPOINTMENT_STATUS, newAppointment } from '../../data/schema.js';
import { useSession } from '../../core/session.jsx';

const STORAGE_KEY = 'charlington_internal_messages_v5';

const MOCK_STAFF = [
  { id: '1', nome: 'Dra. Ana Silva', cargo: 'Neuropediatra', ramal: '102', online: true },
  { id: '2', nome: 'Carlos Mendes', cargo: 'Recepção', ramal: '101', online: true },
  { id: '3', nome: 'Mariana Costa', cargo: 'Fonoaudióloga', ramal: '105', online: true },
  { id: '4', nome: 'Juliana Freitas', cargo: 'Administrativo', ramal: '108', online: false },
  { id: '5', nome: 'Dr. Charlington Cavalcante', cargo: 'Diretor Clínico', ramal: '100', online: true },
  { id: '6', nome: 'Lucas Almeida', cargo: 'Enfermeiro Chefe', ramal: '106', online: false },
];

const INITIAL_MESSAGES = {
  '1': [
    {
      id: 'm1_1',
      sender: '1',
      corpo: 'Oi! O paciente Lucas Pereira das 14h já chegou na recepção?',
      enviadaEm: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'm1_2',
      sender: 'me',
      corpo: 'Ainda não, mas os pais avisaram que estão a caminho.',
      enviadaEm: new Date(Date.now() - 3000000).toISOString(),
      status: 'lida',
    },
    {
      id: 'm1_3',
      sender: '1',
      corpo: 'Perfeito! Assim que fizerem o check-in me avisa por favor.',
      enviadaEm: new Date(Date.now() - 2500000).toISOString(),
    },
  ],
  '2': [
    {
      id: 'm2_1',
      sender: 'me',
      corpo: 'Carlos, pode confirmar a agenda de amanhã?',
      enviadaEm: new Date(Date.now() - 86400000).toISOString(),
      status: 'lida',
    },
    {
      id: 'm2_2',
      sender: '2',
      corpo: 'Tudo confirmado. Te mandei por email.',
      enviadaEm: new Date(Date.now() - 82800000).toISOString(),
    },
  ],
  '3': [
    {
      id: 'm3_1',
      sender: '3',
      corpo: 'Oi, a sala de atendimento neuropediátrico está liberada para o atendimento das 15h30?',
      enviadaEm: new Date(Date.now() - 14400000).toISOString(),
    },
  ],
  '4': [],
  '5': [
    {
      id: 'm5_1',
      sender: '5',
      corpo: 'Bom dia equipe! Reunião clínica de alinhamento hoje às 17h na sala de atendimento neuropediátrico.',
      enviadaEm: new Date(Date.now() - 18000000).toISOString(),
    },
  ],
  '6': [],
};

const AUTO_REPLIES = {
  '1': [
    'Excelente, já registrei a evolução no prontuário eletrônico.',
    'Perfeito, estou na sala de atendimento neuropediátrico finalizando o laudo neurológico.',
    'Obrigada pelo aviso! Qualquer dúvida me chame aqui.',
  ],
  '2': [
    'Já anotei aqui na recepção e avisei a família!',
    'Combinado! Já atualizei o status da consulta no sistema.',
    'Prontinho! Estou acompanhando a chegada dos próximos pacientes.',
  ],
  '3': [
    'Maravilha! Já estou organizando os materiais na sala de atendimento neuropediátrico.',
    'Obrigada! Vou aplicar o protocolo de avaliação na sessão de hoje.',
  ],
  '4': [
    'Mensagem recebida. Já estou providenciando o documento no administrativo.',
    'Tudo certo, já arquivado nas guias de faturamento.',
  ],
  '5': [
    'Ótimo alinhamento. Vamos manter esse padrão de excelência no atendimento.',
    'Recebido. Parabéns pela dedicação aos pacientes da clínica.',
  ],
  '6': [
    'Estoque de insumos e triagem checados para o plantão de hoje.',
    'Perfeito, sinais vitais do paciente já conferidos.',
  ],
};

export default function MessagesScreen() {
  const toast = useToast();
  const [selected, setSelected] = useState('2');
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_MESSAGES;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('todas');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newModalSearch, setNewModalSearch] = useState('');
  const [typingColleague, setTypingColleague] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // fallback
    }
  }, [messages]);

  const filteredStaff = useMemo(() => {
    return MOCK_STAFF.filter((staff) => {
      const matchSearch =
        staff.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.cargo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTab = filterTab === 'todas' || (filterTab === 'online' && staff.online);
      return matchSearch && matchTab;
    });
  }, [searchQuery, filterTab]);

  const activeStaff = useMemo(() => {
    return MOCK_STAFF.find((s) => s.id === selected) || null;
  }, [selected]);

  const onlineCount = useMemo(() => {
    return MOCK_STAFF.filter((s) => s.online).length;
  }, []);

  const handleSendMessage = (msgPayload) => {
    if (!selected) return;

    const newMessage = {
      id: `msg_${Date.now()}`,
      sender: 'me',
      enviadaEm: new Date().toISOString(),
      status: 'entregue',
      ...msgPayload,
    };

    setMessages((prev) => ({
      ...prev,
      [selected]: [...(prev[selected] || []), newMessage],
    }));

    const colleagueId = selected;
    const colleague = MOCK_STAFF.find((s) => s.id === colleagueId);

    if (colleague) {
      setTimeout(() => {
        setTypingColleague(colleagueId);
      }, 900);

      setTimeout(() => {
        setTypingColleague(null);
        const replyPool = AUTO_REPLIES[colleagueId] || [
          'Entendido, estou acompanhando por aqui.',
          'Combinado, qualquer novidade te aviso!',
        ];
        const randomReply = replyPool[Math.floor(Math.random() * replyPool.length)];

        const replyMessage = {
          id: `msg_reply_${Date.now()}`,
          sender: colleagueId,
          corpo: randomReply,
          enviadaEm: new Date().toISOString(),
        };

        setMessages((prev) => ({
          ...prev,
          [colleagueId]: [...(prev[colleagueId] || []), replyMessage],
        }));

        toast.info(`Nova mensagem de ${colleague.nome}`);
      }, 2600);
    }
  };

  const handleVotePoll = (messageId, optionId) => {
    if (!selected) return;
    setMessages((prev) => {
      const thread = prev[selected] || [];
      const updated = thread.map((m) => {
        if (m.id !== messageId || !m.enquete) return m;

        const isMulti = m.enquete.multipla;
        const opcoes = m.enquete.opcoes.map((opt) => {
          if (opt.id === optionId) {
            const willVote = !opt.votou;
            return {
              ...opt,
              votou: willVote,
              votos: willVote ? opt.votos + 1 : Math.max(0, opt.votos - 1),
            };
          }
          if (!isMulti && opt.votou) {
            return { ...opt, votou: false, votos: Math.max(0, opt.votos - 1) };
          }
          return opt;
        });

        const totalVotos = opcoes.reduce((acc, cur) => acc + cur.votos, 0);

        return {
          ...m,
          enquete: {
            ...m.enquete,
            opcoes,
            totalVotos,
          },
        };
      });
      return { ...prev, [selected]: updated };
    });
  };

  const handleToggleEventConfirm = (messageId) => {
    if (!selected) return;
    setMessages((prev) => {
      const thread = prev[selected] || [];
      const updated = thread.map((m) => {
        if (m.id !== messageId || !m.evento) return m;
        const novoStatus = !m.evento.confirmado;
        if (novoStatus) {
          toast.success('Presença confirmada no evento!');
        } else {
          toast.info('Confirmação de presença cancelada.');
        }
        return {
          ...m,
          evento: {
            ...m.evento,
            confirmado: novoStatus,
          },
        };
      });
      return { ...prev, [selected]: updated };
    });
  };

  const handleClearHistory = () => {
    if (!selected) return;
    setMessages((prev) => ({
      ...prev,
      [selected]: [],
    }));
    toast.success('Histórico da conversa limpo com sucesso.');
  };

  return (
    <>
      <PageHeader
        eyebrow="Equipe"
        title="Mensagens Internas"
        description="Comunicação em tempo real entre os colaboradores da clínica."
      />

      <div className="comm comm--chat">
        {/* Painel Esquerdo: Lista de Conversas */}
        <Card variant="flush" className="comm__list">
          <CardHeader
            title="Conversas"
            subtitle={`${onlineCount} online agora`}
            actions={
              <IconButton
                name="plus"
                label="Nova conversa"
                variant="surface"
                onClick={() => setIsNewModalOpen(true)}
              />
            }
          />

          <div className="chat-sidebar-search">
            <div className="chat-sidebar-search__input-wrap">
              <Icon name="search" size={14} />
              <input
                type="text"
                className="chat-sidebar-search__input"
                placeholder="Buscar colega ou cargo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    background: 'none',
                    border: 'none',
                    color: 'var(--ink-400)',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="chat-sidebar-tabs">
              <button
                type="button"
                className={`chat-sidebar-tab ${filterTab === 'todas' ? 'is-active' : ''}`}
                onClick={() => setFilterTab('todas')}
              >
                Todas ({MOCK_STAFF.length})
              </button>
              <button
                type="button"
                className={`chat-sidebar-tab ${filterTab === 'online' ? 'is-active' : ''}`}
                onClick={() => setFilterTab('online')}
              >
                Online ({onlineCount})
              </button>
            </div>
          </div>

          <CardBody>
            {filteredStaff.length > 0 ? (
              <ul className="thread-list">
                {filteredStaff.map((staff) => {
                  const staffMsgs = messages[staff.id] || [];
                  const lastMsg = staffMsgs[staffMsgs.length - 1];
                  const isActive = selected === staff.id;

                  let lastPreview = 'Nova conversa';
                  if (lastMsg) {
                    const prefix = lastMsg.sender === 'me' ? 'Você: ' : '';
                    if (lastMsg.enquete) {
                      lastPreview = `${prefix}📊 Enquete: ${lastMsg.enquete.pergunta}`;
                    } else if (lastMsg.evento) {
                      lastPreview = `${prefix}📅 Evento: ${lastMsg.evento.titulo}`;
                    } else if (lastMsg.media) {
                      lastPreview = `${prefix}📷 Foto/Vídeo`;
                    } else if (lastMsg.anexo) {
                      lastPreview = `${prefix}📄 ${lastMsg.anexo.nome}`;
                    } else {
                      lastPreview = `${prefix}${lastMsg.corpo}`;
                    }
                  }

                  return (
                    <li key={staff.id}>
                      <button
                        type="button"
                        className={isActive ? 'is-active' : ''}
                        onClick={() => setSelected(staff.id)}
                      >
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <Avatar name={staff.nome} size={36} />
                          {staff.online && (
                            <span
                              style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: 'var(--signal-green)',
                                border: '2px solid var(--surface)',
                              }}
                            />
                          )}
                        </div>
                        <span className="thread-list__text">
                          <strong>{staff.nome}</strong>
                          <span>{truncate(lastPreview, 34)}</span>
                        </span>
                        {lastMsg && (
                          <span className="thread-list__time">
                            {relative(lastMsg.enviadaEm)}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon="search"
                title="Nenhum colega encontrado"
                description="Tente outro termo na busca ou limpe o filtro."
                compact
              />
            )}
          </CardBody>
        </Card>

        {/* Painel Direito: Thread e Caixa de Mensagens */}
        <Card variant="flush" className="comm__thread">
          {activeStaff ? (
            <ThreadView
              staff={activeStaff}
              messages={messages[activeStaff.id] || []}
              isTyping={typingColleague === activeStaff.id}
              onSendMessage={handleSendMessage}
              onVotePoll={handleVotePoll}
              onToggleEventConfirm={handleToggleEventConfirm}
              onClearHistory={handleClearHistory}
            />
          ) : (
            <EmptyState
              icon="message-circle"
              title="Selecione uma conversa"
              description="Escolha um colega ao lado para enviar uma mensagem em tempo real ou inicie uma nova conversa."
              action={
                <Button
                  variant="primary"
                  icon="plus"
                  onClick={() => setIsNewModalOpen(true)}
                >
                  Nova conversa
                </Button>
              }
            />
          )}
        </Card>
      </div>

      {/* Modal: Nova Conversa */}
      <Modal
        open={isNewModalOpen}
        onClose={() => {
          setIsNewModalOpen(false);
          setNewModalSearch('');
        }}
        size="md"
        title="Nova conversa interna"
        description="Selecione um colaborador da clínica para iniciar uma conversa em tempo real."
        footer={
          <Button onClick={() => setIsNewModalOpen(false)}>Fechar</Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          <div className="chat-sidebar-search__input-wrap">
            <Icon name="search" size={14} />
            <input
              type="text"
              className="chat-sidebar-search__input"
              placeholder="Pesquisar por nome ou cargo..."
              autoFocus
              value={newModalSearch}
              onChange={(e) => setNewModalSearch(e.target.value)}
            />
          </div>

          <ul className="thread-list" style={{ maxHeight: 320, overflowY: 'auto' }}>
            {MOCK_STAFF.filter((staff) =>
              staff.nome.toLowerCase().includes(newModalSearch.toLowerCase()) ||
              staff.cargo.toLowerCase().includes(newModalSearch.toLowerCase())
            ).map((staff) => (
              <li key={staff.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(staff.id);
                    setIsNewModalOpen(false);
                    setNewModalSearch('');
                  }}
                  style={{ justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
                    <div style={{ position: 'relative' }}>
                      <Avatar name={staff.nome} size={36} />
                      {staff.online && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: 'var(--signal-green)',
                            border: '2px solid var(--surface)',
                          }}
                        />
                      )}
                    </div>
                    <div className="chat-header__text">
                      <strong style={{ fontSize: 'var(--t-body)', color: 'var(--ink-900)' }}>
                        {staff.nome}
                      </strong>
                      <span style={{ fontSize: 'var(--t-caption)', color: 'var(--ink-400)' }}>
                        {staff.cargo} · Ramal {staff.ramal}
                      </span>
                    </div>
                  </div>
                  <Chip tone={staff.online ? 'success' : 'neutral'}>
                    {staff.online ? 'Online' : 'Offline'}
                  </Chip>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </>
  );
}

function ThreadView({
  staff,
  messages,
  isTyping,
  onSendMessage,
  onVotePoll,
  onToggleEventConfirm,
  onClearHistory,
}) {
  const toast = useToast();
  const { plaza, user } = useSession();
  const [inputText, setInputText] = useState('');
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  // Controle do menu popover flutuante estilo WhatsApp
  const [isAttachPopoverOpen, setIsAttachPopoverOpen] = useState(false);

  // Modais das funções ativas
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollMultiple, setPollMultiple] = useState(false);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [eventTime, setEventTime] = useState('17:00');
  const [eventRoom, setEventRoom] = useState('Sala de Atendimento Neuropediátrico');
  const [eventDescription, setEventDescription] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaInputRef = useRef(null);
  const attachPopoverRef = useRef(null);

  // Fecha o popover ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isAttachPopoverOpen &&
        attachPopoverRef.current &&
        !attachPopoverRef.current.contains(e.target) &&
        !e.target.closest('.attach-trigger-btn')
      ) {
        setIsAttachPopoverOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isAttachPopoverOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    inputRef.current?.focus();
    setIsAttachPopoverOpen(false);
  }, [staff.id]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage({ corpo: inputText.trim() });
    setInputText('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 1. Upload de Documentos
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const formattedSize = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
    const ext = file.name.split('.').pop()?.toUpperCase() || 'ARQUIVO';

    onSendMessage({
      corpo: `Arquivo: ${file.name}`,
      anexo: {
        nome: file.name,
        tamanho: formattedSize,
        tipo: ext,
      },
    });

    setIsAttachPopoverOpen(false);
    toast.success(`Arquivo "${file.name}" anexado.`);
    e.target.value = '';
  };

  // 2. Upload de Fotos e Vídeos
  const handleMediaSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video');

    onSendMessage({
      corpo: isVideo ? `Vídeo: ${file.name}` : `Foto: ${file.name}`,
      media: {
        tipo: isVideo ? 'video' : 'imagem',
        url,
        nome: file.name,
      },
    });

    setIsAttachPopoverOpen(false);
    toast.success(`${isVideo ? 'Vídeo' : 'Foto'} enviada com sucesso.`);
    e.target.value = '';
  };

  // 3. Criar Enquete
  const handleSubmitPoll = (e) => {
    e.preventDefault();
    if (!pollQuestion.trim()) {
      toast.error('Informe a pergunta da enquete.');
      return;
    }
    const cleanOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      toast.error('A enquete precisa de pelo menos 2 opções.');
      return;
    }

    onSendMessage({
      corpo: `📊 Enquete: ${pollQuestion.trim()}`,
      enquete: {
        pergunta: pollQuestion.trim(),
        multipla: pollMultiple,
        opcoes: cleanOptions.map((texto, idx) => ({
          id: `opt_${Date.now()}_${idx}`,
          texto,
          votos: 0,
          votou: false,
        })),
        totalVotos: 0,
      },
    });

    setIsPollModalOpen(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollMultiple(false);
    toast.success('Enquete publicada no chat!');
  };

  // 4. Criar Evento
  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      toast.error('Informe o título do evento.');
      return;
    }

    const trimmedTitle = eventTitle.trim();
    const trimmedDesc = eventDescription.trim();

    onSendMessage({
      corpo: `📅 Evento: ${trimmedTitle}`,
      evento: {
        titulo: trimmedTitle,
        data: eventDate,
        horario: eventTime,
        local: eventRoom,
        descricao: trimmedDesc,
        confirmado: false,
      },
    });

    try {
      const rooms = await repo.list(STORES.ROOMS).catch(() => []);
      const matchedRoom = rooms.find((r) => r.nome === eventRoom);
      const startIso = new Date(`${eventDate}T${eventTime}:00`).toISOString();
      const endIso = new Date(new Date(startIso).getTime() + 60 * 60000).toISOString();

      await repo.create(STORES.APPOINTMENTS, {
        ...newAppointment({ praca: plaza || matchedRoom?.praca }),
        tipo: 'evento',
        titulo: trimmedTitle,
        descricao: trimmedDesc,
        salaId: matchedRoom ? matchedRoom.id : null,
        inicio: startIso,
        fim: endIso,
        status: APPOINTMENT_STATUS.CONFIRMED,
        observacoes: trimmedDesc ? `Pauta: ${trimmedDesc}` : 'Reunião/evento interno da clínica agendado pela equipe.',
        origem: 'Mensagens Internas',
      }, {
        auditDetail: `Evento na agenda: ${trimmedTitle} (${eventRoom})`,
      });

      toast.success('Evento publicado no chat e registrado na Agenda!');
    } catch (err) {
      console.warn('Erro ao salvar evento na agenda:', err);
      toast.success('Convite de evento publicado no chat!');
    }

    setIsEventModalOpen(false);
    setEventTitle('');
    setEventDescription('');
  };

  const displayedMessages = useMemo(() => {
    if (!showInChatSearch || !chatSearchQuery.trim()) return messages;
    return messages.filter((m) =>
      (m.corpo || '').toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
      (m.enquete?.pergunta || '').toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
      (m.evento?.titulo || '').toLowerCase().includes(chatSearchQuery.toLowerCase())
    );
  }, [messages, showInChatSearch, chatSearchQuery]);

  return (
    <div className="chat-box" style={{ position: 'relative' }}>
      {/* Inputs nativos ocultos para Arquivo e Fotos/Vídeos */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
      />
      <input
        ref={mediaInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleMediaSelect}
        accept="image/*,video/*"
      />

      {/* Cabeçalho do Chat */}
      <div className="chat-header">
        <div className="chat-header__info">
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar name={staff.nome} size={40} />
            {staff.online && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  background: 'var(--signal-green)',
                  border: '2px solid var(--surface)',
                }}
              />
            )}
          </div>
          <div className="chat-header__text">
            <span className="chat-header__name">{staff.nome}</span>
            <div className="chat-header__status">
              <span>{staff.cargo} · Ramal {staff.ramal}</span>
              <span>·</span>
              <span style={{ color: staff.online ? 'var(--signal-green-ink)' : 'var(--ink-400)' }}>
                {staff.online ? 'Online agora' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="chat-header__tools">
          <IconButton
            name="search"
            label="Buscar mensagens nesta conversa"
            variant={showInChatSearch ? 'primary' : 'ghost'}
            onClick={() => {
              setShowInChatSearch((v) => !v);
              if (showInChatSearch) setChatSearchQuery('');
            }}
          />
          <IconButton
            name="whatsapp"
            label="Contato rápido"
            variant="ghost"
            onClick={() => {
              toast.info(`Ramal direto da clínica: ${staff.ramal} (${staff.cargo})`);
            }}
          />
          <IconButton
            name="more-horizontal"
            label="Opções da conversa"
            variant="ghost"
            onClick={() => setIsOptionsOpen(true)}
          />
        </div>
      </div>

      {/* Barra de Pesquisa Interna no Chat */}
      {showInChatSearch && (
        <div className="chat-search-bar">
          <Icon name="search" size={14} />
          <input
            type="text"
            placeholder="Filtrar mensagens na conversa atual..."
            value={chatSearchQuery}
            autoFocus
            onChange={(e) => setChatSearchQuery(e.target.value)}
          />
          {chatSearchQuery && (
            <span style={{ fontSize: 'var(--t-micro)', color: 'var(--ink-400)' }}>
              {displayedMessages.length} encontrada(s)
            </span>
          )}
          <IconButton
            name="x"
            label="Fechar busca"
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowInChatSearch(false);
              setChatSearchQuery('');
            }}
          />
        </div>
      )}

      {/* Área de Mensagens */}
      <div className="chat-body">
        {displayedMessages.length > 0 && (
          <span className="chat-date-divider">Hoje</span>
        )}

        {displayedMessages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', padding: 'var(--s-8)' }}>
            <EmptyState
              icon="message-circle"
              title={showInChatSearch ? 'Nenhuma mensagem encontrada' : 'Início da conversa'}
              description={
                showInChatSearch
                  ? 'Nenhum resultado corresponde à sua pesquisa.'
                  : `Envie a primeira mensagem para ${staff.nome}.`
              }
              compact
            />
          </div>
        ) : (
          displayedMessages.map((message) => {
            const isMe = message.sender === 'me';
            return (
              <div
                key={message.id}
                className={`chat-msg ${isMe ? 'chat-msg--out' : 'chat-msg--in'}`}
              >
                {!isMe && (
                  <Avatar name={staff.nome} size={28} />
                )}
                <div className="chat-msg__bubble">
                  {message.corpo && <p className="chat-msg__text">{message.corpo}</p>}

                  {/* 1. Anexo de Arquivo/Documento */}
                  {message.anexo && (
                    <div className="chat-attachment">
                      <Icon name="file-text" size={20} />
                      <div className="chat-attachment__info">
                        <span className="chat-attachment__name">{message.anexo.nome}</span>
                        <span className="chat-attachment__size">{message.anexo.tipo} · {message.anexo.tamanho}</span>
                      </div>
                      <IconButton
                        name="download"
                        label="Baixar arquivo"
                        size="sm"
                        variant="ghost"
                        onClick={() => toast.success(`Download de ${message.anexo.nome} iniciado.`)}
                      />
                    </div>
                  )}

                  {/* 2. Fotos e Vídeos */}
                  {message.media && (
                    <div className="chat-media-preview">
                      {message.media.tipo === 'video' ? (
                        <video src={message.media.url} controls style={{ width: '100%', borderRadius: 'var(--r-sm)' }} />
                      ) : (
                        <img src={message.media.url} alt={message.media.nome} style={{ width: '100%', borderRadius: 'var(--r-sm)' }} />
                      )}
                    </div>
                  )}

                  {/* 3. Enquete Interativa com Votação */}
                  {message.enquete && (
                    <div className="chat-poll">
                      <p className="chat-poll__title">{message.enquete.pergunta}</p>
                      <div className="chat-poll__options">
                        {message.enquete.opcoes.map((opt) => {
                          const pct = message.enquete.totalVotos > 0
                            ? Math.round((opt.votos / message.enquete.totalVotos) * 100)
                            : 0;
                          return (
                            <div
                              key={opt.id}
                              className={`chat-poll__option ${opt.votou ? 'is-selected' : ''}`}
                              onClick={() => onVotePoll(message.id, opt.id)}
                            >
                              <div className="chat-poll__option-header">
                                <span className="chat-poll__option-text">
                                  {opt.votou ? '✓ ' : ''}{opt.texto}
                                </span>
                                <span className="chat-poll__option-votes">
                                  {opt.votos} {opt.votos === 1 ? 'voto' : 'votos'} ({pct}%)
                                </span>
                              </div>
                              <div className="chat-poll__track">
                                <div className="chat-poll__fill" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="chat-poll__footer">
                        <span>{message.enquete.multipla ? 'Múltiplas escolhas' : 'Escolha única'}</span>
                        <span>{message.enquete.totalVotos} {message.enquete.totalVotos === 1 ? 'voto total' : 'votos totais'}</span>
                      </div>
                    </div>
                  )}

                  {/* 4. Evento / Reunião com Confirmação */}
                  {message.evento && (
                    <div className="chat-event">
                      <div className="chat-event__head">
                        <div className="chat-event__badge">
                          <span className="chat-event__badge-month">
                            {new Date(message.evento.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                          </span>
                          <span className="chat-event__badge-day">
                            {new Date(message.evento.data + 'T12:00:00').getDate()}
                          </span>
                        </div>
                        <span className="chat-event__title">{message.evento.titulo}</span>
                      </div>

                      <div className="chat-event__details">
                        <div className="chat-event__detail-row">
                          <Icon name="clock" size={13} />
                          <span>{message.evento.horario}</span>
                        </div>
                        <div className="chat-event__detail-row">
                          <Icon name="door" size={13} />
                          <span>{message.evento.local}</span>
                        </div>
                        {message.evento.descricao && (
                          <div style={{ marginTop: 4, color: 'var(--ink-600)' }}>
                            {message.evento.descricao}
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant={message.evento.confirmado ? 'secondary' : 'primary'}
                        className="chat-event__confirm-btn"
                        onClick={() => onToggleEventConfirm(message.id)}
                      >
                        {message.evento.confirmado ? '✓ Presença confirmada' : 'Confirmar presença'}
                      </Button>
                    </div>
                  )}

                  <div className="chat-msg__meta">
                    <span>{dateTime(message.enviadaEm)}</span>
                    {isMe && (
                      <span title="Entregue" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <Icon name="check" size={12} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isTyping && (
          <div className="chat-typing">
            <span className="chat-typing__dots">
              <span className="chat-typing__dot" />
              <span className="chat-typing__dot" />
              <span className="chat-typing__dot" />
            </span>
            <span>{staff.nome} está digitando...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Menu flutuante de anexos estilo WhatsApp */}
      {isAttachPopoverOpen && (
        <div ref={attachPopoverRef} className="chat-attach-popover">
          {/* 1. Upload de Arquivo / Documento */}
          <button
            type="button"
            className="chat-attach-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="chat-attach-circle chat-attach-circle--arquivo">
              <Icon name="folder" size={24} />
            </div>
            <span className="chat-attach-label">Arquivo</span>
          </button>

          {/* 2. Upload de Fotos e Vídeos */}
          <button
            type="button"
            className="chat-attach-btn"
            onClick={() => mediaInputRef.current?.click()}
          >
            <div className="chat-attach-circle chat-attach-circle--midia">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            </div>
            <span className="chat-attach-label">Fotos e vídeos</span>
          </button>

          {/* 3. Criar Enquete */}
          <button
            type="button"
            className="chat-attach-btn"
            onClick={() => {
              setIsAttachPopoverOpen(false);
              setIsPollModalOpen(true);
            }}
          >
            <div className="chat-attach-circle chat-attach-circle--enquete">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="6" width="14" height="3" rx="1.5" />
                <rect x="3" y="11" width="18" height="3" rx="1.5" />
                <rect x="3" y="16" width="10" height="3" rx="1.5" />
              </svg>
            </div>
            <span className="chat-attach-label">Enquete</span>
          </button>

          {/* 4. Criar Evento */}
          <button
            type="button"
            className="chat-attach-btn"
            onClick={() => {
              setIsAttachPopoverOpen(false);
              setIsEventModalOpen(true);
            }}
          >
            <div className="chat-attach-circle chat-attach-circle--evento">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="3" />
                <path d="M16 2v4M8 2v4M3 10h18" />
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="chat-attach-label">Evento</span>
          </button>
        </div>
      )}

      {/* Rodapé / Input de Mensagem */}
      <div className="chat-footer">
        {/* Respostas Rápidas */}
        <div className="chat-quick-replies">
          <button
            type="button"
            className="chat-quick-btn"
            onClick={() => setInputText('👍 Confirmado!')}
          >
            👍 Confirmado!
          </button>
          <button
            type="button"
            className="chat-quick-btn"
            onClick={() => setInputText('📋 Já anexei a evolução no prontuário.')}
          >
            📋 Já no prontuário
          </button>
          <button
            type="button"
            className="chat-quick-btn"
            onClick={() => setInputText('🕒 Em 5 minutos chego na recepção.')}
          >
            🕒 Em 5 min chego
          </button>
          <button
            type="button"
            className="chat-quick-btn"
            onClick={() => setInputText('✅ Pode liberar o paciente para atendimento.')}
          >
            ✅ Pode liberar
          </button>
          <button
            type="button"
            className="chat-quick-btn"
            onClick={() => setInputText('📞 Pode confirmar o horário comigo?')}
          >
            📞 Confirma horário?
          </button>
        </div>

        {/* Linha do Input Principal */}
        <div className="chat-input-row">
          <IconButton
            name="paperclip"
            label="Anexar (Arquivo, Fotos e vídeos, Enquete ou Evento)"
            variant={isAttachPopoverOpen ? 'primary' : 'surface'}
            className="attach-trigger-btn"
            onClick={() => setIsAttachPopoverOpen((v) => !v)}
          />

          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder={`Digite uma mensagem para ${staff.nome}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <IconButton
            name="arrow-right"
            label="Enviar mensagem"
            shape="circle"
            variant="primary"
            disabled={!inputText.trim()}
            onClick={handleSend}
          />
        </div>
      </div>

      {/* Modal: Criar Enquete */}
      <Modal
        open={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        size="md"
        title="Criar enquete interna"
        description="Envie uma pergunta com opções de voto para os colaboradores responderem diretamente no chat."
        footer={
          <>
            <Button onClick={() => setIsPollModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSubmitPoll}>Enviar enquete</Button>
          </>
        }
      >
        <form onSubmit={handleSubmitPoll} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          <TextField
            label="Pergunta da enquete"
            required
            placeholder="Ex: Qual o melhor horário para o alinhamento clínico?"
            autoFocus
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
            <label style={{ display: 'block', fontSize: 'var(--t-caption)', fontWeight: 'var(--w-medium)', color: 'var(--ink-900)' }}>
              Opções de resposta *
            </label>
            {pollOptions.map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'center' }}>
                <input
                  type="text"
                  className="chat-input"
                  style={{ flex: 1, borderRadius: 'var(--r-sm)' }}
                  placeholder={`Opção ${idx + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const next = [...pollOptions];
                    next[idx] = e.target.value;
                    setPollOptions(next);
                  }}
                  required
                />
                {pollOptions.length > 2 && (
                  <IconButton
                    name="x"
                    label="Remover opção"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setPollOptions(pollOptions.filter((_, i) => i !== idx));
                    }}
                  />
                )}
              </div>
            ))}

            {pollOptions.length < 6 && (
              <Button
                size="sm"
                variant="secondary"
                icon="plus"
                style={{ alignSelf: 'flex-start', marginTop: 4 }}
                onClick={() => setPollOptions([...pollOptions, ''])}
              >
                Adicionar opção
              </Button>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--t-caption)', color: 'var(--ink-800)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={pollMultiple}
              onChange={(e) => setPollMultiple(e.target.checked)}
            />
            Permitir que os membros votem em mais de uma opção
          </label>
        </form>
      </Modal>

      {/* Modal: Criar Evento */}
      <Modal
        open={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        size="md"
        title="Criar evento ou reunião"
        description="Agende um compromisso ou alinhamento com a equipe da clínica."
        footer={
          <>
            <Button onClick={() => setIsEventModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSubmitEvent}>Criar evento</Button>
          </>
        }
      >
        <form onSubmit={handleSubmitEvent} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          <TextField
            label="Título do evento"
            required
            placeholder="Ex: Discussão de Caso Clínico - Neuropediatria"
            autoFocus
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
            <TextField
              label="Data"
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
            <TextField
              label="Horário"
              type="time"
              required
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </div>

          <Select
            label="Local / Sala"
            required
            value={eventRoom}
            onChange={(e) => setEventRoom(e.target.value)}
            options={[
              { value: 'Sala de Atendimento Neuropediátrico', label: 'Sala de Atendimento Neuropediátrico' },
              { value: 'Recepção Central', label: 'Recepção Central' },
            ]}
          />

          <TextArea
            label="Descrição ou pauta (opcional)"
            rows={3}
            placeholder="Descreva o objetivo da reunião, pacientes em pauta, etc."
            value={eventDescription}
            onChange={(e) => setEventDescription(e.target.value)}
          />
        </form>
      </Modal>

      {/* Modal: Opções da Conversa */}
      <Modal
        open={isOptionsOpen}
        onClose={() => setIsOptionsOpen(false)}
        size="sm"
        title={`Opções: ${staff.nome}`}
        description="Gerencie as configurações e o histórico deste chat."
        footer={
          <Button onClick={() => setIsOptionsOpen(false)}>Fechar</Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          <Button
            variant="secondary"
            icon="trash"
            onClick={() => {
              setIsOptionsOpen(false);
              onClearHistory();
            }}
          >
            Limpar mensagens desta conversa
          </Button>
          <Button
            variant="secondary"
            icon="bell"
            onClick={() => {
              setIsOptionsOpen(false);
              toast.success(`Notificações de ${staff.nome} silenciadas por 1 hora.`);
            }}
          >
            Silenciar notificações
          </Button>
          <Button
            variant="secondary"
            icon="download"
            onClick={() => {
              setIsOptionsOpen(false);
              toast.success('Histórico exportado em formato seguro.');
            }}
          >
            Exportar histórico de mensagens
          </Button>
        </div>
      </Modal>
    </div>
  );
}

const truncate = (text, max) => {
  const value = String(text ?? '');
  return value.length > max ? `${value.slice(0, max)}…` : value;
};
