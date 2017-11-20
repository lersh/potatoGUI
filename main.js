'use strict'
const { app, BrowserWindow, Menu, Tray } = require('electron');
const fs = require('fs');
const ipc = require('electron').ipcMain;
const net = require('net');
const socks = require('socks-proxy');
const notifier = require('node-notifier');
var config = require('./config.json');

//log4js module
var log4js = require('log4js');
var logConfig = require('./logConfig.json');
log4js.configure(logConfig);
var logger = log4js.getLogger('client');

let win, tray, willQuitApp = false;;
let windowConfig = {
    width: 400,
    height: 700,
    icon: __dirname + '/icons/icon.png',
    title: 'potatoGUI',
    resizable: false
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


function startServer(){
    const server = socks.createServer(function (client) {
        var address = client.address;
        logger.trace('浏览器想要连接： %s:%d', address.address, address.port);
    
        var potatoServer = net.connect(potatoPort, potatoAddr, function () {//连接远程代理服务器
            var potatoSocket = this;//potato服务器的连接
    
            logger.trace('连上了potato服务器');
            //构造一个信令告诉potato服务器要连接的目标地址
            var req = Potato.SymbolRequest.Create(address.address, address.port);  //Potato.CreateHead.ConnectRequest(address.address, address.port);
            potatoSocket.write(req);//将信令发给potato服务器
            logger.trace('发送连接信令  %s:%d', potatoSocket.remoteAddress, potatoSocket.remotePort);
    
            potatoSocket.once('data', (data) => {//第一次收到回复时
                var reply = Potato.SymbolPeply.Resolve(data);//解析返回的信号
                logger.trace(reply);
    
                client.reply(reply.sig);//将状态发给浏览器
                logger.trace('收到的信号：%d，目标地址： %s:%d', reply.sig, address.address, address.port);//浏览器收到连通的信号就会开始发送真正的请求数据
                //var cipher = crypto.createCipher(algorithm, password),
                //	decipher = crypto.createDecipher(algorithm, password);
                var cipher = new Potato.EncryptStream(),
                    decipher = new Potato.DecryptStream();
                client//浏览器的socket
                    .pipe(cipher)//加密
                    .pipe(potatoSocket)//传给远程代理服务器
                    .pipe(decipher)//将返回的数据解密
                    .pipe(client);//远程代理服务器的数据再回传给浏览器
            });
    
            potatoSocket.on('error', (err) => {
                logger.error('potato服务器错误：%s\r\n%s', err.code, err.message);
                switch (err.code) {
                    case 'ECONNRESET':
                        logger.error('potato服务器断开了连接。%s:%d', address.address, address.port);
                        client.end();//断开浏览器连接
                        potatoSocket.end();//断开和服务器的连接
                        break;
                    default:
                }
            });
        });
    
        client.on('error', (err) => {
            //logger.error('浏览器端连接错误：%s\r\n%s', err.code, err.message);
            switch (err.code) {
                case 'EPIPE':
                case 'ECONNRESET':
                    logger.error('浏览器断开了连接。');
                    break;
                default:
                    logger.error('浏览器连接错误。', err);
            }
            potatoServer.end();
            client.end();
        });
        potatoServer.on('error', (err) => {
            logger.error('potato服务器错误：%s\r\n%s', err.code, err.message);
            client.end();
        });
    });
    
 
    server.listen(local_port, () => {
        logger.info('listening on ' + local_port);
    });
}


process.on('uncaughtException', function (err) {
	switch (err.code) {
		case 'ECONNREFUSED':
			logger.error('远程服务器拒绝连接，可能已经关闭. ' + err.message);
			break;
		default:
			logger.error("process error: " + err.message);
			logger.error(err.stack);
	}
});