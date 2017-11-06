'use strict'
const { app, BrowserWindow, Menu, Tray } = require('electron');
const ipc = require('electron').ipcMain;

let win, tray;
let windowConfig = {
    width: 400,
    height: 700,
    resizable: false
}
let trayMenuTemplate = [
    {
        label: '关于',
        click: function () {
            win.show();
            console.log('about');
        }
    },
    {
        label: '启动',
        click: function () {
            win.hide();
            console.log('start');
        }
    }]




function createWindow() {
    win = new BrowserWindow(windowConfig);
    win.loadURL(`file://${__dirname}/index.html`);
    //win.webContents.openDevTools();
    win.setMenu(null);
    win.on('close', () => {
        win = null;
    });
    //win.on('resize', () => {
    //    win.reload();
    //});
    tray = new Tray('./icons/chips.png');
    tray.setToolTip('potatoStream is Ready');
    const contextMenu = Menu.buildFromTemplate(trayMenuTemplate);
    tray.setContextMenu(contextMenu);
    tray.on('click', function () {
        tray.popUpContextMenu();
    })
    tray.on('double-click', () => {
        console.log('double-click');
    });

}

app.on('ready', createWindow);
app.on('window-all-closed', () => {
    app.quit();
});
app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});

ipc.on('console-alert', (event, arg) => {
    console.log(arg);
})