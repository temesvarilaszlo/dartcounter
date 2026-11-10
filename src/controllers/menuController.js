import { renderMenu } from '../views/screens/menuView.js';
import { openModal } from '../views/components/modal.js';
import { showToast } from '../views/components/toast.js';
import { resumeModel } from './gameModels.js';

export const CORRUPT_GAME_MESSAGE = "The saved game couldn't be read, so it was discarded.";

export class MenuController {
  constructor(ctx) {
    this.ctx = ctx;
    this.prompted = false;
  }

  show() {
    const { status } = this.ctx.activeGame.load();
    if (status === 'corrupt') showToast(CORRUPT_GAME_MESSAGE);
    this.render();
    // Asked once per launch; the resume card stays for later.
    if (status === 'ok' && !this.prompted) this.promptResume();
    this.prompted = true;
  }

  render() {
    const { activeGame, registry, viewParts, root } = this.ctx;
    const types = registry.list()
      .filter((type) => viewParts[type.id])
      .map((type) => ({ id: type.id, label: type.label, description: type.description, glyph: viewParts[type.id].glyph }));
    const resume = activeGame.session ? resumeModel(activeGame, viewParts[activeGame.typeId]) : null;
    renderMenu(root, { resume, types }, {
      onResume: () => this.ctx.navigate('#/game'),
      onDiscard: () => this.confirmDiscard(),
    });
  }

  promptResume() {
    const resume = resumeModel(this.ctx.activeGame, this.ctx.viewParts[this.ctx.activeGame.typeId]);
    openModal({
      title: 'Resume your game?',
      body: [`${resume.typeLabel} ${resume.description}: ${resume.players.map((p) => `${p.name} ${p.score}`).join(', ')}.`],
      actions: [
        { label: 'Discard', variant: 'danger', onClick: () => this.discard() },
        { label: 'Resume', variant: 'primary', onClick: () => this.ctx.navigate('#/game') },
      ],
    });
  }

  confirmDiscard() {
    openModal({
      title: 'Discard the game in progress?',
      body: ['It will be gone for good.'],
      actions: [
        { label: 'Keep it', variant: 'quiet' },
        { label: 'Discard', variant: 'danger', onClick: () => this.discard() },
      ],
    });
  }

  discard() {
    this.ctx.activeGame.discard();
    this.render();
  }
}
