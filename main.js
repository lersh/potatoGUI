'use strict'
const { app, BrowserWindow, Menu, Tray } = require('electron');
const fs = require('fs');
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
    server_addr: config.server_addr,
    server_port: config.server_port,
    local_port: config.local_port,
    method: config.method,
    obfs: config.obfs,
    password: config.password
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
    console.log(arg.msg);
    global.sharedObject.server_addr = arg.server_addr;
    global.sharedObject.server_port = arg.server_port;
    global.sharedObject.password = arg.password;
    global.sharedObject.method = arg.method;
    global.sharedObject.obfs=arg.obfs;


    fs.writeFileSync(`${__dirname}/config.json`, JSON.stringify(global.sharedObject));
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