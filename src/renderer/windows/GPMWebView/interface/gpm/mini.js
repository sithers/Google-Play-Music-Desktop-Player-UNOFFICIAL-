import { remote } from 'electron';

import { positionOnScreen } from '../../../../../_util';

const mainWindow = remote.getCurrentWindow();
const webContents = mainWindow.webContents;
const MINI_SIZE = 310;

let mini = false;

window.wait(() => {
  if (Settings.get('miniAlwaysShowSongInfo', false)) {
    document.body.setAttribute('controls', 'controls');
  }
  window.GPM.mini.setScrollVolume(Settings.get('miniUseScrollVolume', false));

  let wasMaximized = mainWindow.isMaximized();
  let wasFullscreen = mainWindow.isFullScreen();

  window.GPM.on('mini:enable', () => {
    wasFullscreen = mainWindow.isFullScreen();
    mainWindow.setFullScreen(false);
    mainWindow.setFullScreenable(false);
    Emitter.fireSync('mini', { state: true });

	// Restore the mini size/position from settings, otherwise use default size and regular position.
    const miniSize = Settings.get('mini-size', [MINI_SIZE, MINI_SIZE]);
    const miniPosition = Settings.get('mini-position', mainWindow.getPosition());
    mainWindow.setContentSize(...miniSize);
    mainWindow.setSize(...mainWindow.getSize());
    if (positionOnScreen(miniPosition)) {
      mainWindow.setPosition(...miniPosition);
    } else {
      mainWindow.center();
    }
    wasMaximized = mainWindow.isMaximized();
    mainWindow.unmaximize();

    // TODO: Re-enable when the root cause of electron/electron#6783 is fixed
    // remote.getCurrentWindow().setMaximumSize(MINI_SIZE + 20, MINI_SIZE + 20);
    remote.getCurrentWindow().setMinimumSize(50, 50);
    webContents.executeJavaScript('document.body.setAttribute("mini", "mini")');
    remote.getCurrentWebContents().setZoomFactor(1);
    remote.getCurrentWindow().setAlwaysOnTop(Settings.get('miniAlwaysOnTop', false));
    mini = true;
  });

  window.GPM.on('mini:disable', () => {
    mainWindow.setFullScreen(wasFullscreen);
    mainWindow.setFullScreenable(true);
    Emitter.fire('mini', { state: false });
    remote.getCurrentWindow().setMaximumSize(99999999, 999999999);
    remote.getCurrentWindow().setMinimumSize(200, 200);

    // Restore the regular size/position from settings.
    const regularSize = Settings.get('size');
    const regularPosition = Settings.get('position');
    mainWindow.setSize(...regularSize);
    if (positionOnScreen(regularPosition)) {
      mainWindow.setPosition(...regularPosition);
    } else {
      mainWindow.center();
    }

    if (wasMaximized) mainWindow.maximize();

    webContents.executeJavaScript('document.body.removeAttribute("mini", "mini")');
    remote.getCurrentWebContents().setZoomFactor(1);
    remote.getCurrentWindow().setAlwaysOnTop(false);
    mini = false;
  });
});

let nextZoom;
Emitter.on('set:zoom', (event, factor) => {
  if (nextZoom) {
    clearTimeout(nextZoom);
  }
  nextZoom = setTimeout(() => {
    remote.getCurrentWebContents().setZoomFactor(factor);
  }, 5);
});

Emitter.on('miniAlwaysShowSongInfo', (event, state) => {
  if (state.state) {
    document.body.setAttribute('controls', 'controls');
  } else {
    document.body.removeAttribute('controls');
  }
});
Emitter.on('miniAlwaysOnTop', (event, state) => {
  if (mini) {
    remote.getCurrentWindow().setAlwaysOnTop(state.state);
  }
});
Emitter.on('miniUseScrollVolume', (event, state) => {
  window.GPM.mini.setScrollVolume(state.state);
});
