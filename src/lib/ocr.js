const Tesseract = require('tesseract.js');
const path = require('path');

/**
 * Function to process image into text
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<string>} - Result text
 */
async function processOCR(buffer) {
  try {
    const { data: { text } } = await Tesseract.recognize(
      buffer,
      'ind+eng',
      {
        cachePath: path.join(__dirname, '../temp'),
        // logger: m => console.log(m) // Enable to debug
      }
    );
    return text ? text.trim() : null;
  } catch (error) {
    console.error('OCR Lib Error:', error);
    throw error;
  }
}

module.exports = { processOCR };
