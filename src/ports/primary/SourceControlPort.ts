export interface SourceControlPort {
    /**
     * Initialise la vue de contrôle de source.
     */
    initialize(): void;

    /**
     * Met à jour la liste des fichiers modifiés.
     * @param files Liste des chemins de fichiers modifiés.
     */
    updateResources(files: string[]): void;

    /**
     * Récupère le message de commit actuel.
     */
    getCommitMessage(): string;

    /**
     * Définit le message de commit.
     * @param message Le nouveau message.
     */
    setCommitMessage(message: string): void;
}
