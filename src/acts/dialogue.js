// One runner for every choice-driven scene: the command, the first words
// between Adam and Eve, the serpent, and the blaming.

import { wait } from '../core/utils.js';

/**
 * Play a list of dialogue nodes. Each node is {voice|serpent|adam, gloss, replies[]},
 * and each reply is {he, en, sway, retort}.
 *
 * @returns the accumulated `sway` across the scene.
 */
export async function runExchange(ctx, scene, {
  speaker = '', player = '',
  dwellVoice = 5000, dwellReply = 4000, dwellRetort = 4400,
  onNode = null, onReply = null, gap = .45,
} = {}) {
  const { ui, state } = ctx;
  if (!scene || !Array.isArray(scene.nodes)) return 0;

  let sway = 0;
  for (let i = 0; i < scene.nodes.length; i++) {
    if (state?.skipToAct != null) return sway;
    const node = scene.nodes[i];
    const line = node.voice || node.serpent || node.adam;
    const t = i / Math.max(1, scene.nodes.length - 1);

    await onNode?.(node, i, t);

    await ui.speak(speaker, line, node.gloss, { dwell: dwellVoice });

    const choice = await ui.choose(node.replies);
    const reply = (node.replies || [])[choice] || null;
    sway += reply?.sway ?? 0;

    await onReply?.(reply, node, i, sway);

    if (reply) await ui.speak(player, reply, null, { dwell: dwellReply });
    if (reply?.retort) await ui.speak(speaker, reply.retort, null, { dwell: dwellRetort });

    await ui.hideSpeak();
    await wait(gap);
  }

  if (scene.close?.narration) await ui.narrateAll(scene.close.narration);
  return sway;
}
