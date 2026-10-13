// Envoi d'e-mails du site (inscriptions, rappels, alertes). Texte brut + version HTML sobre.
import type { Core } from '@strapi/strapi';

const echapper = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Transforme un texte brut en HTML minimal (paragraphes, liens cliquables). */
function versHtml(texte: string): string {
  const avecLiens = echapper(texte).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1c2b33">${avecLiens
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')}</div>`;
}

export const urlSite = () => (process.env.SITE_URL ?? '').replace(/\/+$/, '');

export async function envoyerEmail(strapi: Core.Strapi, { to, sujet, texte }: { to: string; sujet: string; texte: string }) {
  await strapi.plugin('email').service('email').send({ to, subject: sujet, text: texte, html: versHtml(texte) });
}

export async function lireIdentite(strapi: Core.Strapi) {
  const p: any = await strapi.db.query('api::parametres.parametres').findOne({});
  return { nomSite: p?.nomSite ?? 'My Job Community', emailNotification: p?.emailNotificationInscriptions ?? null };
}

/** Prévient la collectivité (adresse « e-mail de notification » des Informations du site). */
export async function alerterCollectivite(strapi: Core.Strapi, sujet: string, texte: string) {
  const { nomSite, emailNotification } = await lireIdentite(strapi);
  if (!emailNotification) return false;
  await envoyerEmail(strapi, { to: emailNotification, sujet: `[${nomSite}] ${sujet}`, texte });
  return true;
}
