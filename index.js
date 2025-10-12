const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const P = require('pino');
const express = require('express');
const axios = require('axios');
const path = require('path');
const qrcode = require('qrcode-terminal');

const config = require('./config');
const { sms, downloadMediaMessage } = require('./lib/msg');
const {
  getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson
} = require('./lib/functions');
const { File } = require('megajs');
const { commands, replyHandlers } = require('./command');

const app = express();
const port = process.env.PORT || 8000;

const prefix = '.';
const ownerNumber = ['94779890822'];
const credsPath = path.join(__dirname, '/auth_info_baileys/creds.json');

async function ensureSessionFile() {
  if (!fs.existsSync(credsPath)) {
    if (!config.SESSION_ID) {
      console.error('❌ SESSION_ID env variable is missing. Cannot restore session.');
      process.exit(1);
    }

    console.log("🔄 creds.json not found. Downloading session from MEGA...");

    const sessdata = config.SESSION_ID;
    const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);

    filer.download((err, data) => {
      if (err) {
        console.error("❌ Failed to download session file from MEGA:", err);
        process.exit(1);
      }

      fs.mkdirSync(path.join(__dirname, '/auth_info_baileys/'), { recursive: true });
      fs.writeFileSync(credsPath, data);
      console.log("✅ Session downloaded and saved. Restarting bot...");
      setTimeout(() => {
        connectToWA();
      }, 2000);
    });
  } else {
    setTimeout(() => {
      connectToWA();
    }, 1000);
  }
}

async function connectToWA() {
  console.log("Connecting sudda-MD 🧬...");
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, '/auth_info_baileys/'));
  const { version } = await fetchLatestBaileysVersion();

  const sudda = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.macOS("Firefox"),
    auth: state,
    version,
    syncFullHistory: true,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
  });

  sudda.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        connectToWA();
      }
    } else if (connection === 'open') {
      console.log('✅ sudda-MD connected to WhatsApp');

      const up = `sudda-MD connected ✅\n\nPREFIX: ${prefix}`;
      await sudda.sendMessage(ownerNumber[0] + "@s.whatsapp.net", {
        image: { url: `data:image/jpeg;base64,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` },
        caption: up
      });

      fs.readdirSync("./plugins/").forEach((plugin) => {
        if (path.extname(plugin).toLowerCase() === ".js") {
          require(`./plugins/${plugin}`);
        }
      });
    }
  });

  sudda.ev.on('creds.update', saveCreds);

  sudda.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.messageStubType === 68) {
        await sudda.sendMessageAck(msg.key);
      }
    }

    const mek = messages[0];
    if (!mek || !mek.message) return;

    mek.message = getContentType(mek.message) === 'ephemeralMessage' ? mek.message.ephemeralMessage.message : mek.message;
    if (mek.key.remoteJid === 'status@broadcast') return;

    const m = sms(sudda, mek);
    const type = getContentType(mek.message);
    const from = mek.key.remoteJid;
    const body = type === 'conversation' ? mek.message.conversation : mek.message[type]?.text || mek.message[type]?.caption || '';
    const isCmd = body.startsWith(prefix);
    const commandName = isCmd ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : '';
    const args = body.trim().split(/ +/).slice(1);
    const q = args.join(' ');

    const sender = mek.key.fromMe ? sudda.user.id : (mek.key.participant || mek.key.remoteJid);
    const senderNumber = sender.split('@')[0];
    const isGroup = from.endsWith('@g.us');
    const botNumber = sudda.user.id.split(':')[0];
    const pushname = mek.pushName || 'Sin Nombre';
    const isMe = botNumber.includes(senderNumber);
    const isOwner = ownerNumber.includes(senderNumber) || isMe;
    const botNumber2 = await jidNormalizedUser(sudda.user.id);

    const groupMetadata = isGroup ? await sudda.groupMetadata(from).catch(() => {}) : '';
    const groupName = isGroup ? groupMetadata.subject : '';
    const participants = isGroup ? groupMetadata.participants : '';
    const groupAdmins = isGroup ? await getGroupAdmins(participants) : '';
    const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
    const isAdmins = isGroup ? groupAdmins.includes(sender) : false;

    const reply = (text) => sudda.sendMessage(from, { text }, { quoted: mek });

    if (isCmd) {
      const cmd = commands.find((c) => c.pattern === commandName || (c.alias && c.alias.includes(commandName)));
      if (cmd) {
        if (cmd.react) sudda.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
        try {
          cmd.function(sudda, mek, m, {
            from, quoted: mek, body, isCmd, command: commandName, args, q,
            isGroup, sender, senderNumber, botNumber2, botNumber, pushname,
            isMe, isOwner, groupMetadata, groupName, participants, groupAdmins,
            isBotAdmins, isAdmins, reply,
          });
        } catch (e) {
          console.error("[PLUGIN ERROR]", e);
        }
      }
    }

    const replyText = body;
    for (const handler of replyHandlers) {
      if (handler.filter(replyText, { sender, message: mek })) {
        try {
          await handler.function(sudda, mek, m, {
            from, quoted: mek, body: replyText, sender, reply,
          });
          break;
        } catch (e) {
          console.log("Reply handler error:", e);
        }
      }
    }
  });
}

ensureSessionFile();

app.get("/", (req, res) => {
  res.send("Hey, sudda-MD started✅");
});

app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
