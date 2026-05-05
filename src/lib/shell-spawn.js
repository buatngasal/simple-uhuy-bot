const { spawn } = require('child_process');

/**
 * Function to execute terminal commands using SPAWN (Stream-based).
 */
async function runShell(sock, msg, command, config) {
    const senderId = msg.key.participant || msg.key.remoteJid;
    const senderNumber = senderId.replace(/[^0-9]/g, '');

    const isOwner = config.ownerNumber.includes(senderNumber);
    const isDev = config.devNumber.includes(senderNumber);

    if (!isOwner && !isDev) return;

    await sock.sendMessage(msg.key.remoteJid, { react: { text: "⚙️", key: msg.key } });

    // Split command (e.g., "ls -la" into command: "ls", args: ["-la"])
    // This is required because spawn accepts arguments as an array
    const args = command.split(' ');
    const cmd = args.shift();

    // Run process (using shell: true to support pipes/redirects on Windows & Linux)
    const child = spawn(cmd, args, { shell: true });

    let stdout = '';
    let stderr = '';

    // Capture standard output (streaming data)
    child.stdout.on('data', (data) => {
        stdout += data.toString();
    });

    // Capture standard error (streaming data)
    child.stderr.on('data', (data) => {
        stderr += data.toString();
    });

    // Execution completed
    child.on('close', async (code) => {
        if (stderr.trim() && !stdout.trim()) {
            return sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ *${code}*\n\n${stderr.trim()}` 
            }, { quoted: msg });
        }

        const result = (stdout + stderr).trim() || "✅ Executed (No output)";
        
        // Protection: If output exceeds 4000 characters, send as a file to prevent WA
        if (result.length > 4000) {
            const fs = require('fs');
            const path = './temp_result.txt';
            fs.writeFileSync(path, result);
            await sock.sendMessage(msg.key.remoteJid, { 
                document: fs.readFileSync(path), 
                fileName: 'shell_result.txt', 
                mimetype: 'text/plain' 
            }, { quoted: msg });
            return fs.unlinkSync(path); // Delete temp file
        }

        await sock.sendMessage(msg.key.remoteJid, { 
            text: `${result}` 
        }, { quoted: msg });
    });

    // Error if command not found or fails to execute
    child.on('error', async (err) => {
        await sock.sendMessage(msg.key.remoteJid, { 
            text: `${err.message}` 
        }, { quoted: msg });
    });
}

module.exports = { runShell };
