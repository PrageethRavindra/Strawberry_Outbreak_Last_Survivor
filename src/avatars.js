// Survivor characters a player can choose. The drawings live in public/js/avatars.js;
// this list is the server's source of truth for which ids are allowed.
const AVATARS = ['soldier', 'ninja', 'robot', 'astronaut', 'knight', 'pirate', 'wizard', 'alien'];
const DEFAULT_AVATAR = 'soldier';

function isValid(id) {
  return typeof id === 'string' && AVATARS.includes(id);
}

module.exports = { AVATARS, DEFAULT_AVATAR, isValid };
