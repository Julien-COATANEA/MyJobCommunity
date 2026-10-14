// Affichage accessible des erreurs d'un formulaire (RGAA 11.10 et 11.11), partagé par l'inscription aux événements et
// le formulaire de contact : message sous chaque champ, champ marqué invalide, récapitulatif cliquable qui reçoit le
// focus. Les identifiants suivent la convention `${prefixe}-${nom}` (champ) et `${prefixe}-${nom}-erreur` (message).

export interface Elements {
  formulaire: HTMLFormElement;
  resume: HTMLElement;
  resumeListe: HTMLElement;
  prefixe: string;
}

export function creerAffichageErreurs({ formulaire, resume, resumeListe, prefixe }: Elements) {
  const nettoyer = () => {
    resume.hidden = true;
    resumeListe.replaceChildren();
    for (const p of formulaire.querySelectorAll<HTMLElement>('.champ__erreur')) {
      p.hidden = true;
      p.textContent = '';
    }
    for (const champ of formulaire.querySelectorAll<HTMLElement>('[aria-invalid]')) {
      champ.removeAttribute('aria-invalid');
      const reste = champ.getAttribute('aria-describedby')?.replace(/\s*\S+-erreur/, '').trim();
      if (reste) champ.setAttribute('aria-describedby', reste);
      else champ.removeAttribute('aria-describedby');
    }
  };

  const ajouterAuResume = (contenu: Node) => {
    const li = document.createElement('li');
    li.append(contenu);
    resumeListe.append(li);
  };

  const afficher = (erreurs: Record<string, string>) => {
    for (const [nom, message] of Object.entries(erreurs)) {
      const champ = formulaire.querySelector<HTMLElement>(`#${prefixe}-${nom}`);
      const zone = formulaire.querySelector<HTMLElement>(`#${prefixe}-${nom}-erreur`);
      if (!champ || !zone) continue;
      zone.textContent = message;
      zone.hidden = false;
      champ.setAttribute('aria-invalid', 'true');
      champ.setAttribute('aria-describedby', [champ.getAttribute('aria-describedby'), zone.id].filter(Boolean).join(' '));
      const lien = document.createElement('a');
      lien.href = `#${champ.id}`;
      lien.textContent = message;
      ajouterAuResume(lien);
    }
    resume.hidden = false;
    resume.focus();
  };

  /** Message qui ne concerne pas un champ précis (service indisponible, trop d'envois…). */
  const afficherMessage = (message: string) => {
    ajouterAuResume(document.createTextNode(message));
    resume.hidden = false;
    resume.focus();
  };

  return { nettoyer, afficher, afficherMessage };
}
