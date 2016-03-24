'use strict';

const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;
const url = require('url')
const dialog = electron.dialog;
const fs = require('fs')
const Aria2 = require('aria2');
const Menu = electron.Menu;
const MenuItem = electron.MenuItem;
const path = require('path')
    // Keep a global reference of the window object, if you don't, the window will
    // be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
var TorrentFile = '';
var JsonrpcUrl = '';
ipcMain.on('asynchronous-message', function(event, arg) {
    JsonrpcUrl = arg;
    if (TorrentFile && JsonrpcUrl) {
        addTorrent(TorrentFile)
    }
    // event.sender.send('asynchronous-reply', '');
});

function addTorrent(file) {
    if (path.extname(file).toLowerCase() == '.torrent') {
        var parsed = url.parse(JsonrpcUrl)
        var options = {}
        if (parsed.auth) {
            options.secret = parsed.auth.split(':')[1]
        }
        options.secure = parsed.protocol === 'wss:'
        options.host = parsed.hostname
        options.port = parsed.port
        options.path = parsed.path

        var aria2 = new Aria2(options);
        aria2.onopen = function() {
            var bitmap = fs.readFileSync(file);
            var torrent = new Buffer(bitmap).toString('base64');
            aria2.send('addTorrent', torrent, function(err, gid) {
                if (err) dialog.showErrorBox('Error', err)
                if (gid) {
                    var buttons = ['OK'];
                    dialog.showMessageBox(mainWindow, { type: 'info', buttons: buttons, title: 'Success', message: 'Add torrent success' })
                }
                aria2.close();
            })
        }
        aria2.open(function(err) {
            if (err) {
                dialog.showErrorBox('Error', 'Aria2 open error\nMaybe the aria2c RPC server not run')
            }
        });
    }
}

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({ width: 800, height: 600 });

    // and load the index.html of the app.
    mainWindow.loadURL('file://' + __dirname + '/index.html');

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();


    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
    var template = [{
        label: 'Edit',
        submenu: [{
            label: 'Undo',
            accelerator: 'CmdOrCtrl+Z',
            role: 'undo'
        }, {
            label: 'Redo',
            accelerator: 'Shift+CmdOrCtrl+Z',
            role: 'redo'
        }, {
            type: 'separator'
        }, {
            label: 'Cut',
            accelerator: 'CmdOrCtrl+X',
            role: 'cut'
        }, {
            label: 'Copy',
            accelerator: 'CmdOrCtrl+C',
            role: 'copy'
        }, {
            label: 'Paste',
            accelerator: 'CmdOrCtrl+V',
            role: 'paste'
        }, {
            label: 'Select All',
            accelerator: 'CmdOrCtrl+A',
            role: 'selectall'
        }, ]
    }, {
        label: 'View',
        submenu: [{
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: function(item, focusedWindow) {
                if (focusedWindow)
                    focusedWindow.reload();
            }
        }, {
            label: 'Toggle Full Screen',
            accelerator: (function() {
                if (process.platform == 'darwin')
                    return 'Ctrl+Command+F';
                else
                    return 'F11';
            })(),
            click: function(item, focusedWindow) {
                if (focusedWindow)
                    focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
            }
        }, {
            label: 'Toggle Developer Tools',
            accelerator: (function() {
                if (process.platform == 'darwin')
                    return 'Alt+Command+I';
                else
                    return 'Ctrl+Shift+I';
            })(),
            click: function(item, focusedWindow) {
                if (focusedWindow)
                    focusedWindow.toggleDevTools();
            }
        }, ]
    }, {
        label: 'Window',
        role: 'window',
        submenu: [{
            label: 'Minimize',
            accelerator: 'CmdOrCtrl+M',
            role: 'minimize'
        }, {
            label: 'Close',
            accelerator: 'CmdOrCtrl+W',
            role: 'close'
        }, ]
    }, {
        label: 'Help',
        role: 'help',
        submenu: [{
            label: 'Learn More',
            click: function() {
              electron.shell.openExternal('https://github.com/mkanako/Yaaw-Electron')
            }
        }, ]
    }, ];

    if (process.platform == 'darwin') {
        var name = app.getName();
        template.unshift({
            label: name,
            submenu: [{
                label: 'About ' + name,
                role: 'about'
            }, {
                type: 'separator'
            }, {
                label: 'Services',
                role: 'services',
                submenu: []
            }, {
                type: 'separator'
            }, {
                label: 'Hide ' + name,
                accelerator: 'Command+H',
                role: 'hide'
            }, {
                label: 'Hide Others',
                accelerator: 'Command+Alt+H',
                role: 'hideothers'
            }, {
                label: 'Show All',
                role: 'unhide'
            }, {
                type: 'separator'
            }, {
                label: 'Quit',
                accelerator: 'Command+Q',
                click: function() { app.quit(); }
            }, ]
        });
        // Window menu.
        template[3].submenu.push({
            type: 'separator'
        }, {
            label: 'Bring All to Front',
            role: 'front'
        });
    }
    var menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}
app.on('open-file', function(e, path) {
    e.preventDefault();
    TorrentFile = path;
    if (JsonrpcUrl) {
        addTorrent(path)
    }
});
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});
