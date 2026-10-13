// « Ajouter à mon agenda » : fichier iCalendar (.ics) généré pour chaque événement, compatible Outlook, Google, Apple.
import type { APIRoute, GetStaticPaths } from 'astro';
import { lireEvenements, lireParametres, type Evenement } from '../../lib/contenus';

export const getStaticPaths = (async () =>
  (await lireEvenements()).map((evenement) => ({ params: { slug: evenement.slug }, props: { evenement } }))) satisfies GetStaticPaths;

const dateIcs = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
// Échappement RFC 5545 (antislash, virgule, point-virgule, retours à la ligne).
const texteIcs = (t: string) => t.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\r?\n/g, '\\n');

export const GET: APIRoute = async ({ props, site }) => {
  const e = props.evenement as Evenement;
  const { nomSite } = await lireParametres();
  const fin = e.dateFin ?? new Date(new Date(e.dateDebut).getTime() + 2 * 3600_000).toISOString();
  const url = new URL(`/evenements/${e.slug}/`, site).toString();
  const lignes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${texteIcs(nomSite)}//Événements//FR`,
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${e.documentId}@${new URL(site!).hostname}`,
    `DTSTAMP:${dateIcs(new Date().toISOString())}`,
    `DTSTART:${dateIcs(e.dateDebut)}`,
    `DTEND:${dateIcs(fin)}`,
    `SUMMARY:${texteIcs(e.titre)}`,
    `DESCRIPTION:${texteIcs(`${e.extrait}\n\n${url}`)}`,
    `LOCATION:${texteIcs(e.enLigne ? 'En ligne' : [e.lieu, e.adresse].filter(Boolean).join(', '))}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return new Response(lignes.join('\r\n') + '\r\n', { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
};
