import { Component } from 'react';
import { Card, EmptyState } from './Card.jsx';
import { Button } from './primitives.jsx';

/**
 * Fronteira de erro.
 *
 * Sem ela, uma exceção durante a renderização de qualquer tela desmonta a
 * árvore inteira e o React entrega uma página em branco — em um sistema
 * clínico isso é pior do que o defeito original: o profissional perde o painel
 * no meio do atendimento e não recebe nenhuma pista do que aconteceu.
 *
 * A fronteira contém a falha no menor escopo possível (a tela em que ocorreu),
 * mantém o Shell, a navegação e as gavetas de pé, e mostra o erro técnico —
 * não uma mensagem genérica que impede o suporte de agir.
 *
 * Nada aqui é registrado na auditoria: a pilha de um erro de renderização pode
 * carregar trechos de dado clínico em memória, e a trilha de auditoria não é
 * lugar para isso.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.retry = this.retry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[painel] falha ao renderizar', this.props.scope ?? '', error, info?.componentStack);
  }

  retry() {
    this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Card>
        <EmptyState
          icon="alert-triangle"
          title="Esta tela falhou ao carregar"
          description="O restante do painel continua funcionando. Se o erro se repetir, copie a mensagem técnica abaixo e envie ao suporte."
          action={
            <div className="error-boundary__actions">
              <Button variant="primary" icon="refresh" onClick={this.retry}>Tentar de novo</Button>
              <Button onClick={() => window.location.reload()}>Recarregar o painel</Button>
            </div>
          }
        />
        <details className="error-boundary__detail">
          <summary>Mensagem técnica</summary>
          <pre>{String(error?.stack || error?.message || error)}</pre>
        </details>
      </Card>
    );
  }
}
