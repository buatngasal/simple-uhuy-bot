const emojiCommand = require('../commands/main/emoji'); // ADJUST PATH to your emoji.js file

module.exports = {
    async handle(sock, msg) {
        // 1. Extract text from various message types (regular chat or reply)
        const body = msg.message?.conversation || 
                     msg.message?.extendedTextMessage?.text || 
                     "";

        if (!body) return;

        // 2. Split string into an array of characters (safe for emojis/skin tones)
        const emojiArray = [...body.trim()];

        // 3. Validation: Must be exactly 1 character AND that character must be an Emoji
        // Regex \p{Emoji} ensures it is a valid emoji
        const isEmoji = /\p{Emoji}/u.test(body.trim());

        if (emojiArray.length === 1 && isEmoji) {
            console.log(`[Auto-Emoji] Mendeteksi: ${body}`);
            
            // 4. Call the execute function from the previously created emoji.js file
            // Pass emojiArray as an argument
            try {
                await emojiCommand.execute(sock, msg, emojiArray);
            } catch (err) {
                console.error("Error di Auto-Emoji:", err);
            }
            return true; // Mark message as handled
        }

        return false; // Not a single emoji, ignore
    }
};
