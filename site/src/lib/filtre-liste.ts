// Filtre instantané d'une liste déjà affichée (annuaire, événements) : sans JavaScript, tout reste visible.

interface Options {
  formulaire: HTMLFormElement;
  elements: HTMLElement[];
  resultats: HTMLElement;
  /** « entreprise » → « 3 entreprises » */
  unite: [singulier: string, pluriel: string];
  /** L'élément correspond-il aux valeurs du formulaire ? */
  correspond: (element: HTMLElement, valeurs: Record<string, string>) => boolean;
}

export const normaliser = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function activerFiltreListe({ formulaire, elements, resultats, unite, correspond }: Options) {
  formulaire.hidden = false;

  const appliquer = () => {
    const valeurs = Object.fromEntries(
      [...new FormData(formulaire)].map(([cle, valeur]) => [cle, normaliser(String(valeur))]),
    ) as Record<string, string>;
    let visibles = 0;
    for (const element of elements) {
      const visible = correspond(element, valeurs);
      element.hidden = !visible;
      if (visible) visibles++;
    }
    resultats.textContent = visibles
      ? `${visibles} ${visibles > 1 ? unite[1] : unite[0]}`
      : `Aucun résultat. Modifiez votre recherche.`;
    const url = new URL(location.href);
    for (const [cle, valeur] of new FormData(formulaire)) {
      if (valeur) url.searchParams.set(cle, String(valeur));
      else url.searchParams.delete(cle);
    }
    history.replaceState(null, '', url);
  };

  // Valeurs initiales depuis l'URL (liens partagés, retour arrière).
  for (const [cle, valeur] of new URLSearchParams(location.search)) {
    const champ = formulaire.elements.namedItem(cle) as HTMLInputElement | HTMLSelectElement | null;
    if (champ) champ.value = valeur;
  }

  let attente: ReturnType<typeof setTimeout>;
  formulaire.addEventListener('input', () => {
    clearTimeout(attente);
    attente = setTimeout(appliquer, 200);
  });
  formulaire.addEventListener('change', appliquer);
  formulaire.addEventListener('submit', (e) => e.preventDefault());
  if (location.search) appliquer();
}

export const contient = (texte: string | undefined, recherche: string) => !recherche || normaliser(texte ?? '').includes(recherche);
