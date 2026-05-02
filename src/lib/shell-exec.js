const { exec } = require('child_process');

/**
 * Function to execute terminal (shell) commands.
 */
async function runShell(sock, msg, command, config) {
    const senderId = msg.key.participant || msg.key.remoteJid;
    const senderNumber = senderId.replace(/[^0-9]/g, '');

    // Check authorization (Owner/Dev Only)
    const isOwner = config.ownerNumber.includes(senderNumber);
    const isDev = config.devNumber.includes(senderNumber);

    // --- DEBUG LOG TO ORIGINAL TERMINAL ---
    console.log('\n' + '='.repeat(35));
    console.log('         --- SHELL EXEC ---');
    console.log('Time    :', new Date().toLocaleTimeString());
    console.log('Command :', command);
    console.log('Access  :', (isOwner || isDev) ? '🔓 GRANTED' : '🔒 DENIED');
    console.log('='.repeat(35) + '\n');

    if (!isOwner && !isDev) return;

    // Add reaction to notify user the command is being processed
    await sock.sendMessage(msg.key.remoteJid, { react: { text: "💻", key: msg.key } });

    // Execute command with a 30s timeout (to prevent hanging)
    exec(command, { timeout: 30000 }, async (error, stdout, stderr) => {
        if (error) {
            return sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ *ERROR:*\n\`\`\`bash\n${error.message}\n\`\`\`` 
            }, { quoted: msg });
        }
        
        if (stderr) {
            return sock.sendMessage(msg.key.remoteJid, { 
                text: `⚠️ *STDERR:*\n\`\`\`bash\n${stderr}\n\`\`\`` 
            }, { quoted: msg });
        }

        const output = stdout.trim() || "✅ Successfully executed with no output.";
        
        await sock.sendMessage(msg.key.remoteJid, { 
            text: `💻 *RESULT:*\n\`\`\`bash\n${output}\n\`\`\`` 
        }, { quoted: msg });
    });
}

module.exports = { runShell };
