const emojiCommand = require('../commands/main/emoji'); // SESUAIKAN PATH ke file emoji.js kamu

module.exports = {
    async handle(sock, msg) {
        // 1. Ambil teks dari berbagai tipe pesan (chat biasa atau reply)
        const body = msg.message?.conversation || 
                     msg.message?.extendedTextMessage?.text || 
                     "";

        if (!body) return;

        // 2. Pecah string menjadi array karakter (aman untuk emoji skin tone/complex)
        const emojiArray = [...body.trim()];

        // 3. Validasi: Harus tepat 1 karakter DAN karakter tersebut adalah Emoji
        // Regex \p{Emoji} memastikan itu benar-benar emoji
        const isEmoji = /\p{Emoji}/u.test(body.trim());

        if (emojiArray.length === 1 && isEmoji) {
            console.log(`[Auto-Emoji] Mendeteksi: ${body}`);
            
            // 4. Panggil fungsi execute dari file emoji.js yang sudah kita buat sebelumnya
            // Kita kirim emojiArray sebagai argumen
            try {
                await emojiCommand.execute(sock, msg, emojiArray);
            } catch (err) {
                console.error("Error di Auto-Emoji:", err);
            }
            return true; // Menandakan pesan sudah ditangani
        }

        return false; // Bukan emoji tunggal, abaikan
    }
};
