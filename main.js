'use strict'
const { app, BrowserWindow, Menu, Tray } = require('electron');
const ipc = require('electron').ipcMain;
const net = require('net');
const notifier = require('node-notifier');
var config = require('./config.json');

let win, tray, willQuitApp = false;;
let windowConfig = {
    width: 400,
    height: 700,
    icon: __dirname + '/icons/icon.png',
    title: 'potatoGUI',
    resizable: true
}
let trayMenuTemplate = [
    {
        label: '刷新',
        click: function () {
            win.reload();
        }
    },
    {

        label: '关于',
        click: function () {
            win.show();
            console.log('about');
        }
    },
    {
        label: '启动开发者工具',
        click: function () {
            win.webContents.openDevTools();
        }
    },
    {
        label: '退出',
        click: function () {
            app.quit();
        }
    }]

global.sharedObject = {
    appVersion: '0.0.1',
    author: 'lersh',
    server_addr: config.server_addr,
    server_port: 1999,
    local_port: 3000,
    method: "https",
    obfs: "cloud.tencent.com",
    password: "1qaz2wsx#EDC"
};

function tcpListen() {
    var server = net.createServer();
    server.on('connection', (socket) => {
        console.log(`Connect from ${socket.remoteAddress}:${socket.remotePort}`);
    });
    server.listen(1999);

}

function createWindow() {
    win = new BrowserWindow(windowConfig);
    win.loadURL(`file://${__dirname}/index.html`);
    //win.webContents.openDevTools();
    win.setMenu(null);
    win.on('close', (e) => {
        if (willQuitApp) {
            win = null;
        }
        else {
            e.preventDefault();
            win.hide();
        }
    });
    //win.on('resize', () => {
    //    win.reload();
    //});
    tray = new Tray(`${__dirname}/icons/chips.png`);
    tray.setToolTip('potatoStream is Ready');
    const contextMenu = Menu.buildFromTemplate(trayMenuTemplate);
    tray.setContextMenu(contextMenu);
    tray.on('click', function () {
        tray.popUpContextMenu();
    })
    tray.on('double-click', () => {
        console.log('double-click');
        win.show();
    });

}


app.on('ready', createWindow);
app.on('window-all-closed', () => {
    if (process.platform != 'darwin')
        app.quit();
});
app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});
app.on('before-quit', () => {
    willQuitApp = true;
});

ipc.on('console-alert', (event, arg) => {
    console.log(arg);
    notifier.notify(
        {
            icon: `${__dirname}/icons/icon.png`,
            title: 'potato GUI',
            message: 'this is a long long\ntext message!'
        });
});
ipc.on('port-listen', (event, arg) => {
    tcpListen();
    win.webContents.send('tcpListen', 'on');
});