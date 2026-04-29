const { isAdmin } = require('./utils');
const { commandPrefix } = require('../../../config');

function formatJid(input) {
  if (!input) return null;
  if (input.endsWith('@s.whatsapp.net') || input.endsWith('@g.us')) return input;
  // Remove non-digit characters and format as JID
  const num = input.replace(/[^0-9]/g, '');
  if (num.length > 5) return num + '@s.whatsapp.net';
  return null;
}

module.exports = {
  name: 'demote',
  description: 'Menurunkan admin grup menjadi anggota biasa (khusus admin)',
  usage: `${commandPrefix}demote @member`,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.participant;
    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '⚠️ Hanya bisa digunakan di grup.' }, { quoted: msg });
    }
    if (!(await isAdmin(sock, jid, sender))) {
      return sock.sendMessage(jid, { text: '⚠️ Perintah ini hanya tersedia bagi admin grup.' }, { quoted: msg });
    }

    // Support reply, mention, or phone number
    let target = args[0];
    if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (msg.message.extendedTextMessage?.contextInfo?.participant) {
      target = msg.message.extendedTextMessage.contextInfo.participant;
    } else {
      target = formatJid(target);
    }
    if (!target) {
      return sock.sendMessage(jid, { text: `*Contoh* : ${commandPrefix}demote @member` }, { quoted: msg });
    }
    try {
      await sock.groupParticipantsUpdate(jid, [target], 'demote');
      await sock.sendMessage(jid, { text: `✅ @${target.split('@')[0]} sekarang bukan admin.`, mentions: [target] }, { quoted: msg });
    } catch (e) {
      console.error('Demote error:', e);
      await sock.sendMessage(jid, { text: '❌ Error demote: ' + (e.message || e.toString()), mentions: [target] }, { quoted: msg });
    }
  },
}; 

// [berhasil] fitur untuk un-admin-kan member ✓