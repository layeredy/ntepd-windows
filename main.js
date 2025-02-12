const { app, BrowserWindow } = require('electron');
const path = require('path');
const createServer = require('./src/server');

let mainWindow = null;
let server = null;

const notesPath = path.join(app.getPath('userData'), 'notes');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'ntepd',
        icon: path.join(__dirname, 'src/images/icon.png')
    });

    mainWindow.setMenu(null);

    const expressApp = createServer(notesPath);
    server = expressApp.listen(5617, () => {
        console.log('Server running on port 5000');
        mainWindow.loadURL('http://localhost:5617');
    });

    mainWindow.on('closed', function() {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (server) {
        server.close();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});