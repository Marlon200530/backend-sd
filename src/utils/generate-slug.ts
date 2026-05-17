export function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD") // Divide os caracteres acentuados em letras e acentos
    .replace(/[\u0300-\u036f]/g, "") // Remove os acentos
    .replace(/[^a-z0-9\s-]/g, "") // Remove caracteres especiais (símbolos)
    .replace(/[\s_]+/g, "-") // Substitui espaços e underscores por hífens
    .replace(/-+/g, "-") // Remove múltiplos hífens seguidos
    .replace(/^-+|-+$/g, ""); // Remove hífens no início ou no fim
}
