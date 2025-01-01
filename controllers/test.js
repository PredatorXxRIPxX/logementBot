const { Client, GatewayIntentBits } = require('discord.js');

// Remplacez par votre token Discord
const BOT_TOKEN = "MTMyMzcyMzE2OTk0MDM3NzY3MA.GgnMeo.2ruydeYVx4_rwsNp4qirLGNdV2lnhzTI82n_SM";
const CHANNEL_ID = "1323721445112545413";

// Créer le client Discord avec tous les intents privilégiés nécessaires
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

// Le reste du code reste le même...
client.once('ready', () => {
  console.log('Le bot est prêt !');
  console.log('Intents activés :', client.options.intents);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  console.log(`Message reçu : "${message.content}"`);
  
  if (message.channel.id === CHANNEL_ID) {
    const messageContent = message.content.trim().toLowerCase();
    
    if (messageContent.startsWith('!setcity ')) {
      const villeCherche = messageContent.slice(9).trim();
      
      if (villeCherche.length > 0) {
        await message.reply(`✅ La ville que vous avez cherchée est : **${villeCherche}**.`);
      } else {
        await message.reply("⚠️ Vous n'avez pas spécifié de ville après la commande ! Exemple : `!setCity Paris`.");
      }
    }
  }
});

client.login(BOT_TOKEN).catch(err => {
  console.error("Erreur lors de la connexion du bot :", err);
});