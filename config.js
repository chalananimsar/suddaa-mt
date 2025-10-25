const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: process.env.SESSION_ID || "",
ALIVE_IMG: process.env.ALIVE_IMG || "https://github.com/chalananimsar/suddaa-mt/blob/main/images/WhatsApp%20Image%202025-09-06%20at%205.32.14%20AM.jpeg?raw=true",
ALIVE_MSG: process.env.ALIVE_MSG || "*Hello👋 sudda-mt Is Alive Now😍*",
BOT_OWNER: '94779890822',  // Replace with the owner's phone number



};
