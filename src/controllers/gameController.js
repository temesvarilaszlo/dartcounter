import { renderGame } from '../views/screens/gameView.js';
import { openModal } from '../views/components/modal.js';
import { showToast } from '../views/components/toast.js';
import { formatDecimal, plural } from '../views/format.js';
import { CORRUPT_GAME_MESSAGE } from './menuController.js';
import { progressText, targetText, wonText } from './gameModels.js';

const MAX_DIGITS = 3;

export class GameController {
  constructor(ctx) {
    this.ctx = ctx;
    this.onKey = (event) => this.handleKey(event);
  }

  get session() {
    return this.ctx.activeGame.session;
  }

  show() {
    const { status } = this.ctx.activeGame.load();
    if (status !== 'ok') {
      if (status === 'corrupt') showToast(CORRUPT_GAME_MESSAGE);
      this.ctx.navigate('#/');
      return;
    }
    this.parts = this.ctx.viewParts[this.ctx.activeGame.typeId];
    this.entry = '';
    this.render();
    document.addEventListener('keydown', this.onKey);
    if (this.session.state.phase !== 'playing') this.showLegSummary();
  }

  leave() {
    document.removeEventListener('keydown', this.onKey);
  }

  model() {
    const { session } = this;
    const { state } = session;
    const rows = session.type.scoreboard(state);
    const inRule = session.config.typeConfig.inRule;
    return {
      title: session.type.describeConfig(session.config),
      progress: progressText(state),
      target: targetText(session.config),
      canUndo: session.legs.some((leg) => leg.turns.length > 0),
      seats: this.ctx.activeGame.players.map((player, seat) => ({
        name: player.name,
        active: seat === state.currentPlayerIndex,
        row: rows[seat],
        won: wonText(state, seat),
        notIn: inRule === 'double' && !rows[seat].isIn,
      })),
    };
  }

  render() {
    this.view = renderGame(this.ctx.root, this.model(), this.parts, {
      onDigit: (digit) => this.setEntry(this.entry.length < MAX_DIGITS ? this.entry + digit : this.entry),
      onBackspace: () => this.setEntry(this.entry.slice(0, -1)),
      onOk: () => this.submitEntry(),
      onUndo: () => this.undo(),
      onExit: () => this.confirmExit(),
    });
    this.view.setEntry({ text: this.entry });
  }

  // A key press clears the previous error.
  setEntry(text, error = null) {
    this.entry = text;
    this.view.setEntry({ text, error });
  }

  handleKey(event) {
    if (document.querySelector('dialog[open]') || this.session?.state.phase !== 'playing') return;
    if (/^\d$/.test(event.key)) this.setEntry(this.entry.length < MAX_DIGITS ? this.entry + event.key : this.entry);
    else if (event.key === 'Backspace') this.setEntry(this.entry.slice(0, -1));
    else if (event.key === 'Enter') this.submitEntry();
    else return;
    event.preventDefault();
  }

  submitEntry() {
    if (this.session.state.phase !== 'playing') return;
    const result = this.session.evaluateInput(this.entry);
    if (!result.valid) {
      this.setEntry(this.entry, result.error);
      return;
    }
    const score = Number(this.entry);
    const minDarts = result.checkout?.minDarts ?? 3;
    if (minDarts === 3) {
      this.commit({ score, darts: 3 });
      return;
    }
    const options = [1, 2, 3].filter((n) => n >= minDarts);
    openModal({
      title: 'Darts used for the checkout?',
      body: [`Checkout of ${score}.`],
      className: 'modal--checkout',
      actions: [
        ...options.map((darts) => ({ label: plural(darts, 'dart'), variant: 'primary', onClick: () => this.commit({ score, darts }) })),
        { label: 'Cancel', variant: 'quiet' },
      ],
    });
  }

  commit(turn) {
    this.session.submitTurn(turn);
    this.afterChange();
    if (this.session.state.phase !== 'playing') this.showLegSummary();
  }

  undo() {
    if (!this.session.undo()) return;
    this.afterChange();
  }

  afterChange() {
    this.ctx.activeGame.save();
    this.entry = '';
    this.render();
  }

  showLegSummary() {
    const { state, type } = this.session;
    const winner = this.ctx.activeGame.players[state.leg.winnerIndex].name;
    const row = type.scoreboard(state)[state.leg.winnerIndex];
    const lastLeg = state.completedLegs.at(-1);
    const over = state.phase === 'gameComplete';
    let title = `${winner} wins leg ${state.legIndex + 1}`;
    if (lastLeg.setWinnerIndex !== null) title = `${winner} wins set ${lastLeg.setIndex + 1}`;
    if (over) title = `${winner} wins the game`;
    openModal({
      title,
      dismissible: false,
      className: 'modal--summary',
      body: [
        progressText(state),
        `Leg: ${plural(row.darts, 'dart')}, 3-dart avg ${formatDecimal(row.average)}`,
      ],
      actions: [
        { label: 'Undo', variant: 'danger', onClick: () => this.undo() },
        over
          ? { label: 'Finish game', variant: 'primary', onClick: () => this.finish() }
          : { label: 'Next leg', variant: 'primary', onClick: () => this.nextLeg() },
      ],
    });
  }

  nextLeg() {
    this.session.startNextLeg();
    this.afterChange();
  }

  async finish() {
    try {
      const record = await this.ctx.activeGame.finish(this.ctx.repos);
      this.ctx.navigate(`#/games/${record.id}`);
    } catch (error) {
      console.error('Saving the game failed', error);
      showToast("Couldn't save the game. Try again.");
      this.showLegSummary();
    }
  }

  confirmExit() {
    openModal({
      title: 'Exit the game?',
      body: ["Progress won't be saved."],
      actions: [
        { label: 'Keep playing', variant: 'quiet' },
        {
          label: 'Exit',
          variant: 'danger',
          onClick: () => {
            this.ctx.activeGame.discard();
            this.ctx.navigate('#/');
          },
        },
      ],
    });
  }
}
