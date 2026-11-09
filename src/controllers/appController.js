import { renderNavbar } from '../views/components/navbar.js';
import { renderMenu } from '../views/screens/menuView.js';
import { renderPreGame } from '../views/screens/preGameView.js';
import { renderGame } from '../views/screens/gameView.js';
import { renderGameDetail } from '../views/screens/gameDetailView.js';
import { renderStats } from '../views/screens/statsView.js';

const NAV_SECTION = { menu: 'menu', preGame: 'menu', game: 'menu', gameDetail: 'stats', stats: 'stats' };

export class AppController {
  constructor({ root, navbar }) {
    this.root = root;
    this.navbar = navbar;
    this.screens = {
      menu: () => renderMenu(this.root),
      preGame: ({ params }) => renderPreGame(this.root, params),
      game: () => renderGame(this.root, { onExit: () => { window.location.hash = '#/'; } }),
      gameDetail: ({ params }) => renderGameDetail(this.root, params),
      stats: ({ query }) => renderStats(this.root, query),
    };
  }

  show(route) {
    renderNavbar(this.navbar, { active: NAV_SECTION[route.name], hidden: route.name === 'game' });
    this.root.dataset.screen = route.name;
    this.screens[route.name](route);
    this.root.scrollTop = 0;
  }
}
