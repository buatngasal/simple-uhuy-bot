const util = require('util');

/**
 * Function to execute JavaScript code (Eval) with Debug Console feature
 */
async function runEval(sock, msg, code, config, args) {
    const senderId = msg.key.participant || msg.key.remoteJid;
    const senderNumber = senderId.replace(/[^0-9]/g, '');

    // Check authorization
    const isOwner = config.ownerNumber.includes(senderNumber);
    const isDev = config.devNumber.includes(senderNumber);

    // --- START DEBUG LOG (TERMINAL) ---
    console.log('\n' + '='.repeat(35));
    console.log('         --- DEBUG EVAL ---');
    console.log('Time         :', new Date().toLocaleTimeString());
    console.log('ID Full      :', senderId);
    console.log('Number Clean :', senderNumber);
    console.log('Status Owner :', isOwner ? '✅ YES' : '❌ NO');
    console.log('Status Dev   :', isDev ? '✅ YES' : '❌ NO');
    console.log('Final Access :', (isOwner || isDev) ? '🔓 GRANTED' : '🔒 DENIED');
    console.log('='.repeat(35) + '\n');
    // --- END DEBUG LOG ---

    // If no access, ignore
    if (!isOwner && !isDev) return;

    // Utility variables for WhatsApp development
    const m = msg;
    const s = sock;
    const conn = sock;
    const client = sock;
    const id = msg.key.remoteJid;
    const q = args.join(' ');

    // --- IMPORT GLOBAL LIBRARIES HERE ---
    const fs = require('fs');
    const path = require('path');
    const axios = require('axios');
    const os = require('os');
    // ----------------------------------------

    try {
        let evaled;
        
        // If code doesn't contain 'return' and isn't a declaration (let/const/var)
        // Attempt to auto-add 'return' so simple instructions still work
        let script = code;
        if (!code.includes('return') && !code.trim().match(/^(let|const|var|if|for|while|switch)/)) {
            script = `return ${code}`;
        }

        const wrappedCode = `(async () => { 
            ${script} 
        })()`;

        evaled = await eval(wrappedCode);

        if (typeof evaled === 'undefined') return; 

        if (typeof evaled !== 'string') {
            evaled = util.inspect(evaled, { depth: 1 });
        }

        await sock.sendMessage(msg.key.remoteJid, { 
            text: `✅ *RESULT:*\n\`\`\`javascript\n${evaled}\n\`\`\`` 
        }, { quoted: msg });

    } catch (err) {
        // If auto-return fails (e.g., due to syntax), try running the original code
        try {
            let evaled = await eval(`(async () => { ${code} })()`);
            if (typeof evaled === 'undefined') return;
            if (typeof evaled !== 'string') evaled = util.inspect(evaled, { depth: 1 });
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ *RESULT:*\n\`\`\`javascript\n${evaled}\n\`\`\`` }, { quoted: msg });
        } catch (finalErr) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ *ERROR:*\n\`\`\`bash\n${String(finalErr)}\n\`\`\`` }, { quoted: msg });
        }
    }
    
}

module.exports = { runEval };
