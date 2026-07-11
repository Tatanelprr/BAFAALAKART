function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s\-]/g, '')
}

export function generateIdentifiant(
  prenom: string,
  nom: string,
  existants: string[]
): string {
  const base = normalize(prenom)[0] + normalize(nom)
  if (!existants.includes(base)) return base
  let i = 1
  while (existants.includes(`${base}${i}`)) i++
  return `${base}${i}`
}
