import express from 'express';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import os from 'os';
import { fileURLToPath } from 'url';
import winston from 'winston';
import { spawn } from 'child_process';

// Pastikan __dirname bisa digunakan dalam ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Direktori penyimpanan
const P2P_DIR = path.resolve(__dirname, 'p2pclient');
const JAVA_FILE = path.resolve(__dirname, 'P2PClientRunner.java');
const JAVA_CLASS = path.resolve(__dirname, 'P2PClientRunner.class');
const LOG_FILE = path.resolve(__dirname, 'p2pclient.log');

// Logger menggunakan winston
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`)
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: LOG_FILE })
    ]
});

// Fungsi untuk mengecek dan meng-compile Java runner
function setupJavaRunner() {
    if (!fs.existsSync(JAVA_FILE)) {
        logger.error('❌ Java runner file is missing!');
        process.exit(1);
    }

    if (!fs.existsSync(JAVA_CLASS)) {
        logger.info('🔄 Compiling Java runner...');
        try {
            const javac = spawn('javac', [JAVA_FILE]);
            javac.on('close', (code) => {
                if (code === 0) {
                    logger.info('✅ Java runner compiled successfully.');
                    startProcess();
                } else {
                    logger.error('❌ Failed to compile Java runner.');
                    process.exit(1);
                }
            });
        } catch (err) {
            logger.error('❌ Compilation error:', err);
            process.exit(1);
        }
    } else {
        logger.info('✅ Java runner already compiled.');
        startProcess();
    }
}

// Fungsi untuk menjalankan p2pclient melalui Java
let peerProcess = null;

function startProcess() {
    logger.info('🚀 Starting p2pclient via Java...');

    peerProcess = spawn('java', ['-cp', __dirname, 'P2PClientRunner']);

    peerProcess.stdout.on('data', (data) => logger.info(data.toString()));
    peerProcess.stderr.on('data', (data) => logger.error(data.toString()));

    peerProcess.on('close', (code) => {
        logger.warn(`⚠️ p2pclient exited with code ${code}. Restarting in 5 seconds...`);
        setTimeout(startProcess, 5000); // Auto-restart jika mati
    });

    peerProcess.on('error', (err) => {
        logger.error('❌ Failed to start p2pclient:', err);
    });
}

// Inisialisasi Express
const app = express();
const PORT = process.env.PORT || 5000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

app.get('/', async (req, res) => {
    try {
        const hostname = os.hostname();
        const { data } = await axios.get('https://ipinfo.io');
        const IP = data.ip;

        let logs = ['Peer2Profit not started, check the process first!'];
        if (fs.existsSync(LOG_FILE)) {
            logs = fs.readFileSync(LOG_FILE, 'utf8').split('\n').slice(-20);
        }

        res.render('index', { IP, hostname, logs });
    } catch (error) {
        logger.error('Error fetching data:', error);
        res.status(500).send('Error fetching data');
    }
});

// Pastikan aplikasi dapat menangani sinyal untuk shutdown yang aman
process.on('SIGINT', () => {
    logger.info('🛑 Stopping p2pclient...');
    if (peerProcess) {
        peerProcess.kill();
    }
    process.exit();
});

app.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
    setupJavaRunner();
});
