Babine Assistante – MVP (PWA hors ligne)

Ce mini-projet te donne:
1) Un agenda Jour/Semaine/Mois avec couleurs par service
2) Un mini-CRM Clients (nom, téléphone, courriel, adresse)
3) Création/édition/suppression de rendez-vous
4) Export JSON (bouton “Exporter”)
5) Installable sur téléphone (PWA)

➡ Déploiement rapide (Vercel):
- Crée un nouveau projet et drop le dossier tel quel.
- Active “Serve static files”. URL de prod = ton domaine Vercel.
- iPhone: Safari → Partager → “Ajouter à l’écran d’accueil”.
- Android: Chrome → “Installer l’app”.

➡ Import/Export (manuel pour MVP):
- Clique “Exporter” pour récupérer babine_export.json.
- Les CSV templates (clients/services/appointments) sont fournis pour préparer des listes.

➡ Étapes suivantes (prochain sprint):
- Auth + base cloud (Supabase) pour synchroniser entre appareils
- Rappels SMS (Twilio) + confirmations
- Sync Google Calendar (lecture/écriture unidirectionnelle)
- Filtres par technicien(ne), salle, statut de paiement
- Formulaires beaux (remplacer les prompts par des écrans modaux)
- Avatar vocal (Speech-to-Text + Text-to-Speech)
