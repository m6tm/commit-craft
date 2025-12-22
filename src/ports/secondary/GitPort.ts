export interface GitFile {
    path: string;
    status: 'modified' | 'untracked' | 'deleted' | 'added' | 'renamed' | 'ignored';
    originalPath?: string;
}

export interface GitPort {
    /**
     * Récupère la liste des fichiers indexés (staged).
     */
    getStagedFiles(): Promise<GitFile[]>;

    /**
     * Récupère la liste des fichiers modifiés non indexés (unstaged).
     */
    getUnstagedFiles(): Promise<GitFile[]>;

    /**
     * S'abonne aux changements de l'état git.
     * @param callback Fonction appelée lors d'un changement.
     */
    onGitStatusChange(callback: () => void): void;

    /**
     * Indexe un fichier (git add).
     */
    stageFile(path: string): Promise<void>;

    /**
     * Désindexe un fichier (git reset).
     */
    unstageFile(path: string): Promise<void>;

    /**
     * Annule les modifications d'un fichier (git checkout/restore).
     */
    discardChanges(path: string): Promise<void>;

    /**
     * Effectue un commit avec le message spécifié.
     */
    commit(message: string): Promise<void>;

    /**
     * Actions globales sur les groupes de fichiers.
     */
    stageAll(): Promise<void>;
    unstageAll(): Promise<void>;
    discardAll(): Promise<void>;
}
