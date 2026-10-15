import { describe, expect, it } from 'vitest';
import { rendreBlocks, type Bloc } from './blocks';
import { A_COMPLETER, remplacerJetonsLegaux } from './jetons-legaux';

const complets = {
  nomSite: 'Emploi Ardèche',
  adresse: '1 rue de la Paix, 07000 Privas',
  telephone: '04 75 00 00 00',
  email: 'contact@exemple.fr',
  editeurNom: 'Département de l’Ardèche',
  editeurSiret: '123 456 789 00012',
  directeurPublication: 'Mme Dupont',
  hebergeurNom: 'OVH',
  hebergeurAdresse: '2 rue Kellermann, 59100 Roubaix',
  hebergeurTelephone: '1007',
  contactDonneesEmail: 'dpo@exemple.fr',
  prestataireNom: 'Konduco',
};

describe('remplacerJetonsLegaux', () => {
  it('remplace tous les jetons par les valeurs des paramètres', () => {
    const t = '{editeur} ({siret}) · {directeur} · {adresse} · {telephone} · {email} · {hebergeur} · {hebergeur-adresse} · {hebergeur-telephone} · {contact-donnees} · {prestataire} · {site} · {url-site}';
    expect(remplacerJetonsLegaux(t, complets, 'https://emploi.exemple.fr/')).toBe(
      'Département de l’Ardèche (123 456 789 00012) · Mme Dupont · 1 rue de la Paix, 07000 Privas · 04 75 00 00 00 · contact@exemple.fr · OVH · 2 rue Kellermann, 59100 Roubaix · 1007 · dpo@exemple.fr · Konduco · Emploi Ardèche · https://emploi.exemple.fr',
    );
  });

  it('retombe sur le nom du site et l’e-mail général', () => {
    const p = { nomSite: 'Emploi Ardèche', email: 'contact@exemple.fr' };
    expect(remplacerJetonsLegaux('{editeur} / {contact-donnees}', p)).toBe('Emploi Ardèche / contact@exemple.fr');
  });

  it('affiche « [à compléter] » pour une valeur vide, absente ou blanche', () => {
    expect(remplacerJetonsLegaux('{siret}', {})).toBe(A_COMPLETER);
    expect(remplacerJetonsLegaux('{siret}', { editeurSiret: null })).toBe(A_COMPLETER);
    expect(remplacerJetonsLegaux('{directeur}', { directeurPublication: '   ' })).toBe(A_COMPLETER);
    expect(remplacerJetonsLegaux('{editeur}', {})).toBe(A_COMPLETER);
    expect(remplacerJetonsLegaux('{url-site}', {})).toBe(A_COMPLETER);
  });

  it('laisse les jetons inconnus intacts (compteurs, accolades ordinaires)', () => {
    expect(remplacerJetonsLegaux('{offres} {inconnu} {Site} { site } {}', complets)).toBe('{offres} {inconnu} {Site} { site } {}');
  });

  it('ne confond pas les jetons à tiret', () => {
    expect(remplacerJetonsLegaux('{hebergeur} / {hebergeur-adresse}', complets)).toBe('OVH / 2 rue Kellermann, 59100 Roubaix');
  });

  it('est échappé en HTML par le rendu des blocs', () => {
    const blocs: Bloc[] = [
      { type: 'heading', level: 2, children: [{ type: 'text', text: 'Éditeur : {editeur}' }] },
      { type: 'paragraph', children: [{ type: 'text', text: '{siret} {offres}' }, { type: 'link', url: '/contact', children: [{ type: 'text', text: '{email}' }] }] },
    ];
    const p = { nomSite: 'A', editeurNom: '<b>Mairie & fils</b>', email: 'a@b.fr' };
    const html = rendreBlocks(blocs, { texte: (t) => remplacerJetonsLegaux(t, p) });
    expect(html).toBe(
      '<h2>Éditeur : &lt;b&gt;Mairie &amp; fils&lt;/b&gt;</h2>\n<p>[à compléter] {offres}<a href="/contact/">a@b.fr</a></p>',
    );
  });
});
