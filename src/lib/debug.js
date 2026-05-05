/**
 * Auto-Debug Mode
 */

// Function to format message JSON
function getMediaDebugInfo(msg) {
    if (!msg.message) return null;
    const fullJson = JSON.stringify(msg.message, null, 2);
    return `${fullJson}`;
}

// Function to log to console and check Owner/Dev permissions
function logDebugStatus(sender, config) {
    const senderNumber = sender.split('@')[0];
    const isOwner = config.ownerNumber.includes(senderNumber);
    const isDev = config.devNumber.includes(senderNumber);
    const isAuthorized = isOwner || isDev;

    const time = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: true 
    });

    console.log(`
===================================
      --- AUTH DEBUG LOG ---
Time         : ${time}
ID Full      : ${sender}
Number Clean : ${senderNumber}
Status Owner : ${isOwner ? '✅ YES' : '❌ NO'}
Status Dev   : ${isDev ? '✅ YES' : '❌ NO'}
Final Access : ${isAuthorized ? '🔓 GRANTED' : '🔒 DENIED'}
===================================`);

    return isAuthorized;
}

module.exports = { getMediaDebugInfo, logDebugStatus };
