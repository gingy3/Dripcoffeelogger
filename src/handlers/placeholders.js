/**
 * Remaining placeholders. Only /history is stubbed — /profile is now live.
 */

/**
 * /history — placeholder until history display is implemented.
 */
async function handleHistory(bot, msg) {
  await bot.sendMessage(
    msg.chat.id,
    `📜 _History display coming soon._`,
    { parse_mode: 'Markdown' },
  );
}

module.exports = { handleHistory };
