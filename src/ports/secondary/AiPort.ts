/**
 * Port secondaire pour les services d'IA.
 */
export interface AiPort {
    /**
     * Génère un texte basé sur un prompt.
     * @param prompt Le prompt à envoyer à l'IA.
     * @returns Le texte généré.
     */
    generateText(prompt: string): Promise<string>;

    /**
     * Génère un message de commit basé sur les changements de fichiers.
     * @param diffs Les différences des fichiers.
     * @returns Un message de commit structuré.
     */
    generateCommitMessage(diffs: string): Promise<string>;
}
