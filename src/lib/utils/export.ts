import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// ────────────────────────────────────────
// PDF exports
// ────────────────────────────────────────

export async function exportListesPDF(
  temps: import('@/types').Temps[],
  creneaux: import('@/types').Creneau[],
  inscriptions: import('@/types').Inscription[],
  stagiaires: import('@/types').User[]
): Promise<void> {
  const doc = new jsPDF()
  let firstPage = true

  for (const t of temps) {
    if (!firstPage) doc.addPage()
    firstPage = false

    const creneau = creneaux.find(c => c.id === t.creneauId)
    const creneauLabel = creneau ? `${creneau.jour} ${creneau.heureDebut}–${creneau.heureFin}` : ''

    doc.setFontSize(14)
    doc.text(t.nom, 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(creneauLabel, 14, 28)
    doc.setTextColor(0)

    const inscrits = inscriptions
      .filter(i => i.tempsId === t.id)
      .map(i => stagiaires.find(s => s.uid === i.stagiaireId))
      .filter(Boolean)
      .map(s => [s!.nom, s!.prenom])

    autoTable(doc, {
      startY: 35,
      head: [['Nom', 'Prénom']],
      body: inscrits.length > 0 ? inscrits : [['—', 'Aucun inscrit']],
      styles: { fontSize: 10 },
    })
  }

  doc.save('listes-par-temps.pdf')
}

export async function exportPresencesPDF(
  temps: import('@/types').Temps[],
  creneaux: import('@/types').Creneau[],
  inscriptions: import('@/types').Inscription[],
  presences: import('@/types').Presence[],
  stagiaires: import('@/types').User[],
  formateurs: import('@/types').User[]
): Promise<void> {
  const doc = new jsPDF()
  let firstPage = true

  for (const t of temps) {
    if (!firstPage) doc.addPage()
    firstPage = false

    const creneau = creneaux.find(c => c.id === t.creneauId)
    const creneauLabel = creneau ? `${creneau.jour} ${creneau.heureDebut}–${creneau.heureFin}` : ''

    doc.setFontSize(14)
    doc.text(t.nom, 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(creneauLabel, 14, 28)
    doc.setTextColor(0)

    const rows = inscriptions
      .filter(i => i.tempsId === t.id)
      .map(i => {
        const stagiaire = stagiaires.find(s => s.uid === i.stagiaireId)
        const presence = presences.find(p => p.stagiaireId === i.stagiaireId && p.tempsId === t.id)
        const formateur = presence?.validePar ? formateurs.find(f => f.uid === presence.validePar) : null
        const heure = presence?.dateValidation
          ? presence.dateValidation.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : ''
        return [
          stagiaire?.nom ?? '?',
          stagiaire?.prenom ?? '?',
          presence?.present ? '✓' : '',
          presence?.present === false ? '✗' : '',
          formateur ? `${formateur.prenom} ${formateur.nom}` : '',
          heure,
        ]
      })

    autoTable(doc, {
      startY: 35,
      head: [['Nom', 'Prénom', 'Présent', 'Absent', 'Validé par', 'Heure']],
      body: rows.length > 0 ? rows : [['—', 'Aucun inscrit', '', '', '', '']],
      styles: { fontSize: 9 },
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' } },
    })
  }

  doc.save('feuilles-de-presence.pdf')
}

// ────────────────────────────────────────
// Excel export
// ────────────────────────────────────────

export async function exportExcel(
  stagiaires: import('@/types').User[],
  formateurs: import('@/types').User[],
  inscriptions: import('@/types').Inscription[],
  presences: import('@/types').Presence[],
  temps: import('@/types').Temps[],
  creneaux: import('@/types').Creneau[]
): Promise<void> {
  const wb = XLSX.utils.book_new()

  // Feuille 1 : Stagiaires
  const stagRows = stagiaires.map(s => ({ Nom: s.nom, Prénom: s.prenom, Identifiant: s.identifiant, Type: s.typeStagiaire ?? '' }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stagRows), 'Stagiaires')

  // Feuille 2 : Formateurs
  const formRows = formateurs.map(f => ({ Nom: f.nom, Prénom: f.prenom, Identifiant: f.identifiant }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(formRows), 'Formateurs')

  // Feuille 3 : Inscriptions
  const inscRows = inscriptions.map(i => {
    const s = stagiaires.find(u => u.uid === i.stagiaireId)
    const t = temps.find(x => x.id === i.tempsId)
    const c = creneaux.find(x => x.id === i.creneauId)
    return {
      Stagiaire: s ? `${s.prenom} ${s.nom}` : i.stagiaireId,
      Temps: t?.nom ?? i.tempsId,
      Créneau: c ? `${c.jour} ${c.heureDebut}` : i.creneauId,
      Origine: i.origine,
      Verrouillé: i.verrouille ? 'Oui' : 'Non',
    }
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inscRows), 'Inscriptions')

  // Feuille 4 : Présences
  const presRows = presences.map(p => {
    const s = stagiaires.find(u => u.uid === p.stagiaireId)
    const t = temps.find(x => x.id === p.tempsId)
    const f = formateurs.find(u => u.uid === p.validePar)
    const heure = p.dateValidation ? p.dateValidation.toDate().toLocaleString('fr-FR') : ''
    return {
      Stagiaire: s ? `${s.prenom} ${s.nom}` : p.stagiaireId,
      Temps: t?.nom ?? p.tempsId,
      Présent: p.present ? 'Oui' : 'Non',
      'Validé par': f ? `${f.prenom} ${f.nom}` : p.validePar,
      'Date validation': heure,
    }
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(presRows), 'Présences')

  XLSX.writeFile(wb, 'bafaalakart-export.xlsx')
}
