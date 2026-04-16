const util = require('util');

module.exports = {
  name: 'eval',
  async execute(sock, msg, args) {
    // Cek apakah ada input kode setelah perintah .eval
    if (!args || args.length === 0) return sock.sendMessage(msg.key.remoteJid, { text: 'Masukkan kode yang ingin dieksekusi!' });

    const code = args.join(' ');
    const id = msg.key.remoteJid;
    
    // Konteks tambahan agar kamu bisa akses variabel penting di dalam eval
    const m = msg;
    const s = sock;

    let response;
    try {
      // Mengeksekusi kode secara asynchronous
      let evaled = await eval(code);

      // Jika hasil eval bukan string, gunakan util.inspect agar rapi (mirip console.log)
      if (typeof evaled !== 'string') {
        evaled = util.inspect(evaled);
      }

      response = `✅ *EVAL SUCCESS*\n\n\`\`\`javascript\n${evaled}\n\`\`\``;
    } catch (err) {
      // Menangkap error jika kode salah
      response = `❌ *EVAL ERROR*\n\n\`\`\`bash\n${String(err)}\n\`\`\``;
    }

    // Mengirim hasil ke chat
    await sock.sendMessage(id, { text: response }, { quoted: msg });
  }
};

// [fix] eval
