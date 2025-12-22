import OpenAI from 'openai';
import * as vscode from 'vscode';
import { AiPort } from '../../ports/secondary/AiPort';

/**
 * Adaptateur pour OpenAI.
 */
export class OpenAiAdapter implements AiPort {
    private client: OpenAI | undefined;

    constructor() {
        this.initializeClient();
    }

    /**
     * Initialise le client OpenAI avec la clé API configurée.
     */
    private initializeClient() {
        const config = vscode.workspace.getConfiguration('commitCraft');
        const apiKey = config.get<string>('openaiApiKey') ?? '';

        this.client = new OpenAI({
            baseURL: 'https://hugbot-ai.vercel.app/api/v1',
            apiKey: apiKey,
        });
        if (apiKey) {
        }
    }

    public async generateText(prompt: string): Promise<string> {
        if (!this.client) {
            this.initializeClient();
            if (!this.client) {
                throw new Error('Clé API OpenAI non configurée. Veuillez l\'ajouter dans les paramètres de l\'extension.');
            }
        }

        try {
            const response = await this.client.chat.completions.create({
                model: 'deepseek-ai/DeepSeek-V3.2',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
            });

            return response.choices[0].message.content || '';
        } catch (error: any) {
            console.error('[CommitCraft] Erreur OpenAI:', error);
            throw new Error(`Erreur lors de la génération avec OpenAI: ${error.message}`);
        }
    }

    public async generateCommitMessage(diffs: string): Promise<string> {
        const systemPrompt = `Tu es un expert en Git et en développement logiciel. 
            Ta mission est de générer un message de commit clair, structuré et détaillé en français en te basant sur les changements fournis (diffs).

            Règles à suivre :
            1. Le format doit être : <type>(<scope>): <sujet>
            - types : feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
            - scope : optionnel, représente la partie du code impactée.
            2. Le sujet doit être à l'impératif présent et ne pas dépasser 50 caractères.
            3. Ajoute une description détaillée si nécessaire, expliquant le "pourquoi" et le "comment".
            4. Utilise des listes à puces pour lister les changements importants.
            5. N'utilise pas d'emojis.
            6. Le message doit être professionnel et précis.
            7. Pas d'emojis.    

            Voici les diffs :
            ${diffs}`;

        return this.generateText(systemPrompt);
    }
}
