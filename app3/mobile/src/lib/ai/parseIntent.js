import { resolveLocale } from '../../i18n';
import { parseRules } from './ruleParser';
import { tryFoundationModels } from './foundationModels';

/**
 * Parse a user utterance into a structured intent.
 * Tries Apple Foundation Models on iOS 26+ when available, then the offline rule parser.
 * Both paths compute dates and numbers in JS.
 */
export async function parseIntent(text, ctx = {}) {
  const locale = resolveLocale(ctx.locale);
  const now = ctx.now || new Date();
  const args = { ...ctx, locale, now, text: String(text || '') };
  const fm = await tryFoundationModels(args.text, args);
  if (fm) return fm;
  return parseRules(args.text, args);
}

export { parseRules };
