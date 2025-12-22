import { GitPort } from '../../ports/secondary/GitPort';
import { AiPort } from '../../ports/secondary/AiPort';

/**
 * Cas d'utilisation pour générer un message de commit via l'IA.
 */
export class GenerateCommitMessageUseCase {
    constructor(
        private readonly gitPort: GitPort,
        private readonly aiPort: AiPort
    ) {}

    /**
     * Exécute la génération du message de commit.
     * @returns Le message de commit généré ou une chaîne vide s'il n'y a pas de changements.
     */
    public async execute(): Promise<string> {
        // 1. Récupérer uniquement les fichiers indexés (staged)
        const stagedFiles = await this.gitPort.getStagedFiles();

        if (stagedFiles.length === 0) {
            return "Veuillez indexer (stager) vos changements avant de générer un message de commit.";
        }

        // 2. Récupérer les diffs des changements indexés
        const allDiffs = await this.gitPort.getAllDiffs(true);

        if (!allDiffs) {
            return "Impossible de récupérer les différences des fichiers indexés.";
        }

        // 3. Générer le message via l'IA
        return await this.aiPort.generateCommitMessage(allDiffs);
    }
}
