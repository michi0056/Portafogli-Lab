# Portafogli Lab

Sito personale per confrontare portafogli. I dati sono salvati in Firebase (Firestore) e si vedono uguali da PC e cellulare, da qualunque rete.

## Accesso
Email e password. L'account si crea una sola volta da Firebase Console → Authentication → Utenti → Aggiungi utente. Non c'è registrazione pubblica.

## Primo avvio
1. Accedi.
2. Carica il backup che hai già: **Carica PDF** → *Scegli file* → seleziona `state.json` (o un backup `portafogli-backup.json`) e conferma.

## Modifiche
Tutto quello che inserisci o modifichi (portafogli, piani, note, combinazioni) viene salvato nel cloud. I PDF vengono letti nel browser: il file non viene caricato da nessuna parte, si salvano solo i dati che controlli.

## Scarica backup
Il pulsante in basso a sinistra scarica tutti i dati in un file JSON, da conservare.

## Configurazione Firebase (una tantum)
- **Authentication → Impostazioni → Domini autorizzati**: aggiungi `michi0056.github.io`.
- **Firestore → Regole**:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## Pubblicazione
Il sito è su GitHub Pages (`https://michi0056.github.io/Portafogli-Lab/`). Ogni modifica al repository si vede dopo uno o due minuti.

## Note
Rendimenti, volatilità e correlazioni sono stime prudenti derivate dai documenti: servono a confrontare, non a prevedere. Non è consulenza finanziaria.
