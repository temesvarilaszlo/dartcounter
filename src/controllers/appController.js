import { renderNavbar } from '../views/components/navbar.js';
import { closeAllModals } from '../views/components/modal.js';
import { MenuController } from './menuController.js';
import { PreGameController } from './preGameController.js';
import { GameController } from './gameController.js';
import { GameDetailController } from './gameDetailController.js';
import { StatsController } from './statsController.js';

const NAV_SECTION = { menu: 'menu', preGame: 'menu', game: 'menu', gameDetail: 'stats', stats: 'stats' };

// ctx: { root, navbar, registry, viewParts, repos, activeGame, lastConfig, navigate }
export class AppController {
  constructor(ctx) {
    this.ctx = ctx;
    this.controllers = {
      menu: new MenuController(ctx),
      preGame: new PreGameController(ctx),
      game: new GameController(ctx),
      gameDetail: new GameDetailController(ctx),
      stats: new StatsController(ctx),
    };
  }

  show(route) {
    this.current?.leave?.();
    closeAllModals();
    renderNavbar(this.ctx.navbar, { active: NAV_SECTION[route.name], hidden: route.name === 'game' });
    this.ctx.root.dataset.screen = route.name;
    this.ctx.root.scrollTop = 0;
    this.current = this.controllers[route.name];
    this.current.show(route);
  }
}
