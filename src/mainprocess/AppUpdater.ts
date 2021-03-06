import { autoUpdater } from 'electron-updater';

let updater;
export default class AppUpdaterV1 {
  public isUpdateDownloaded: boolean = false;

  constructor() {
    const log = require('electron-log');
    log.transports.file.level = 'debug';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.on('update-available', () => {
      // dialog.showMessageBox({
      //     type: 'info',
      //     title: 'Found Updates',
      //     message: 'Found updates, do you want update now?',
      //     buttons: ['Sure', 'No']
      // }, (buttonIndex) => {
      //     if (buttonIndex === 0) {
      if (updater) {
        updater.label = 'Downloading updates. . . . .';
        updater.enabled = false;
      }
      autoUpdater.downloadUpdate();
      //     } else {
      //         updater.enabled = true;
      //         updater = null;
      //     }
      // });
    });
    autoUpdater.on('update-not-available', () => {
      // dialog.showMessageBox({
      //     title: 'No Updates',
      //     message: 'Current version is up-to-date.'
      // });
      if (updater) {
        updater.enabled = true;
        updater = null;
      }
    });

    autoUpdater.on('update-downloaded', () => {
      setTimeout(() => {
        this.isUpdateDownloaded = true;
      }, 60000);

    });

  }
}

export function checkForUpdates(menuItem, focusedWindow, event) {
  updater = menuItem;
  updater.enabled = false;
  autoUpdater.checkForUpdates();
}
