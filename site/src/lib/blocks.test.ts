import { describe, expect, it } from 'vitest';
import { rendreBlocks, tempsLecture, texteBrut, type Bloc } from './blocks';

describe('rendreBlocks', () => {
  it('rend paragraphes, styles et liens', () => {
    const blocs: Bloc[] = [
      { type: 'paragraph', children: [{ type: 'text', text: 'Bonjour ' }, { type: 'text', text: 'monde', bold: true }, { type: 'link', url: '/offres', children: [{ type: 'text', text: 'offres' }] }] },
    ];
    // Chemin interne terminé par « / » (évite une redirection).
    expect(rendreBlocks(blocs)).toBe('<p>Bonjour <strong>monde</strong><a href="/offres/">offres</a></p>');
  });

  it('échappe le HTML saisi par les contributeurs', () => {
    const blocs: Bloc[] = [{ type: 'paragraph', children: [{ type: 'text', text: '<script>alert(1)</script>' }] }];
    expect(rendreBlocks(blocs)).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  });

  it('neutralise les liens javascript:', () => {
    const blocs: Bloc[] = [{ type: 'paragraph', children: [{ type: 'link', url: 'javascript:alert(1)', children: [{ type: 'text', text: 'x' }] }] }];
    expect(rendreBlocks(blocs)).toContain('href="#"');
  });

  it('réserve le h1 au titre de la page (niveau minimum 2)', () => {
    const blocs: Bloc[] = [{ type: 'heading', level: 1, children: [{ type: 'text', text: 'Titre' }] }];
    expect(rendreBlocks(blocs)).toBe('<h2>Titre</h2>');
  });

  it('rend les listes et ignore les paragraphes vides', () => {
    const blocs: Bloc[] = [
      { type: 'list', format: 'ordered', children: [{ type: 'list-item', children: [{ type: 'text', text: 'un' }] }] },
      { type: 'paragraph', children: [{ type: 'text', text: '' }] },
    ];
    expect(rendreBlocks(blocs)).toBe('<ol><li>un</li></ol>\n');
  });

  it('préfixe les images relatives et garde le texte alternatif', () => {
    const blocs: Bloc[] = [{ type: 'image', image: { url: '/uploads/a.jpg', alternativeText: 'Une usine', width: 800, height: 600 } }];
    expect(rendreBlocks(blocs, { baseMedias: 'https://cms.example' })).toContain('src="https://cms.example/uploads/a.jpg" alt="Une usine"');
  });
});

describe('texteBrut', () => {
  it('tronque proprement', () => {
    const blocs: Bloc[] = [{ type: 'paragraph', children: [{ type: 'text', text: 'a '.repeat(200) }] }];
    expect(texteBrut(blocs, 20).length).toBeLessThanOrEqual(20);
  });
});

describe('tempsLecture', () => {
  const paragraphe = (mots: number): Bloc => ({ type: 'paragraph', children: [{ type: 'text', text: Array(mots).fill('mot').join(' ') }] } as Bloc);
  it('compte 200 mots par minute, 1 minute au moins', () => {
    expect(tempsLecture([paragraphe(30)])).toBe(1);
    expect(tempsLecture([paragraphe(600), paragraphe(400)])).toBe(5);
    expect(tempsLecture(null, 'un chapô de quelques mots')).toBe(1);
  });
});
