// Origine du site public pour les redirections des formulaires envoyés sans JavaScript (inscriptions, contact).

/** Origine du site pour la redirection : celle de la requête si elle est autorisée, sinon SITE_URL. */
export function origineSite(ctx: any): string {
  const autorisees = (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  let origine = ctx.get('origin');
  if (!origine && ctx.get('referer')) {
    try {
      origine = new URL(ctx.get('referer')).origin;
    } catch {
      origine = '';
    }
  }
  return autorisees.includes(origine) ? origine : (process.env.SITE_URL ?? '').replace(/\/+$/, '');
}
