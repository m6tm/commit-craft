import * as vscode from 'vscode';
import { GitPort } from '../ports/secondary/GitPort';
import { VsCodeGitAdapter } from '../adapters/secondary/VsCodeGitAdapter';

export class CommitSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'commit-craft.sidebarView';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _gitPort: GitPort
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'generate':
                    vscode.commands.executeCommand('commit-craft.generateMessage');
                    break;
                case 'commit':
                    await this._gitPort.commit(data.message);
                    break;
                case 'ready':
                    this.updateGitStatus();
                    break;
                case 'openFile':
                    this._openFile(data.uri);
                    break;
                case 'stage':
                    await this._gitPort.stageFile(data.uri);
                    break;
                case 'unstage':
                    await this._gitPort.unstageFile(data.uri);
                    break;
                case 'discard':
                    await this._gitPort.discardChanges(data.uri);
                    break;
                case 'stageAll':
                    await this._gitPort.stageAll();
                    break;
                case 'unstageAll':
                    await this._gitPort.unstageAll();
                    break;
                case 'discardAll':
                    await this._gitPort.discardAll();
                    break;
            }
        });

        this._gitPort.onGitStatusChange(() => {
            this.updateGitStatus();
        });
    }

    private async _openFile(uriString: string) {
        const uri = vscode.Uri.parse(uriString);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
    }

    /**
     * Définit le message de commit dans la webview.
     */
    public setCommitMessage(message: string) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'setCommitMessage',
                message: message
            });
        }
    }

    private async updateGitStatus() {
        if (this._view) {
            const stagedFiles = await this._gitPort.getStagedFiles();
            const unstagedFiles = await this._gitPort.getUnstagedFiles();
            const adapter = this._gitPort as VsCodeGitAdapter;
            
            const formatFile = (f: any) => {
                const uri = vscode.Uri.file(f.path);
                return {
                    name: f.path.split(/[\\/]/).pop(),
                    path: adapter.getRelativePath(f.path).split(/[\\/]/).slice(0, -1).join('/') || '.',
                    status: f.status,
                    uri: uri.toString() // On passe l'URI standardisée
                };
            };

            this._view.webview.postMessage({
                type: 'updateGitStatus',
                staged: stagedFiles.map(formatFile),
                unstaged: unstagedFiles.map(formatFile)
            });

            // Mise à jour du badge sur l'icône de l'extension
            const totalChanges = stagedFiles.length + unstagedFiles.length;
            this._view.badge = {
                value: totalChanges,
                tooltip: `${totalChanges} fichier(s) modifié(s)`
            };
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Commit Craft</title>
            <style>
                body { padding: 0; margin: 0; color: var(--vscode-foreground); font-family: var(--vscode-font-family); background-color: var(--vscode-sideBar-background); font-size: 13px; overflow-x: hidden; }
                .container { display: flex; flex-direction: column; }
                .input-section { padding: 10px; display: flex; flex-direction: column; gap: 8px; }
                .input-wrapper { position: relative; }
                textarea { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 6px 8px; padding-right: 75px; font-family: inherit; resize: none; min-height: 30px; height: 30px; width: 100%; box-sizing: border-box; border-radius: 2px; outline: none; overflow: hidden; }
                textarea:focus { border-color: var(--vscode-focusBorder); }
                .generate-btn { position: absolute; top: 4px; right: 4px; background: var(--vscode-button-background); border: none; color: var(--vscode-button-foreground); cursor: pointer; font-size: 11px; padding: 3px 8px; border-radius: 2px; }
                .commit-btn { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 2px; cursor: pointer; width: 100%; height: 28px; font-weight: 400; }
                .changes-section { margin-top: 4px; }
                .section-header { display: flex; align-items: center; padding: 2px 4px; cursor: pointer; background-color: var(--vscode-sideBar-background); height: 22px; }
                .section-header:hover { background-color: var(--vscode-list-hoverBackground); }
                .chevron { width: 16px; height: 16px; margin-right: 2px; fill: currentColor; }
                .section-title { font-weight: bold; font-size: 11px; text-transform: uppercase; flex-grow: 1; }
                .badge { background-color: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border-radius: 10px; padding: 0 6px; font-size: 11px; height: 16px; line-height: 16px; min-width: 8px; text-align: center; margin-right: 4px; }
                .file-list { display: flex; flex-direction: column; }
                .file-item { display: flex; align-items: center; padding: 0 8px 0 20px; height: 22px; cursor: pointer; position: relative; }
                .file-item:hover { background-color: var(--vscode-list-hoverBackground); }
                .file-icon { width: 16px; height: 16px; margin-right: 6px; display: flex; align-items: center; justify-content: center; }
                .file-label { display: flex; align-items: baseline; flex-grow: 1; overflow: hidden; white-space: nowrap; }
                .file-path { color: var(--vscode-descriptionForeground); font-size: 0.9em; margin-left: 6px; opacity: 0.7; }
                .file-actions { display: none; gap: 2px; margin-right: 8px; }
                .file-item:hover .file-actions { display: flex; }
                .action-icon { width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; border-radius: 3px; color: var(--vscode-foreground); }
                .action-icon:hover { background-color: var(--vscode-toolbar-hoverBackground); }
                .action-icon svg { width: 14px; height: 14px; fill: currentColor; }
                .header-actions { display: none; gap: 2px; margin-right: 4px; }
                .section-header:hover .header-actions { display: flex; }
                .status-icon { font-weight: bold; font-size: 11px; width: 12px; text-align: center; }
                .status-m { color: var(--vscode-gitDecoration-modifiedResourceForeground, #e2c08d); }
                .status-u { color: var(--vscode-gitDecoration-untrackedResourceForeground, #73c991); }
                
                /* Accordion Styles */
                .changes-section.collapsed .file-list { display: none; }
                .changes-section.collapsed .chevron { transform: rotate(-90deg); }
                .chevron { transition: transform 0.1s ease-out; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="input-section">
                    <div class="input-wrapper">
                        <textarea id="commit-message" placeholder="Message"></textarea>
                        <button class="generate-btn" id="generate-btn">Générer</button>
                    </div>
                    <button class="commit-btn" id="commit-btn">Commit</button>
                </div>
                <div id="staged-section" class="changes-section">
                    <div class="section-header">
                        <svg class="chevron" viewBox="0 0 16 16"><path d="M7.976 10.072l4.357-4.357.62.618L8.285 11l-.618-.618L3.31 6.025l.619-.618 4.047 4.665z"/></svg>
                        <span class="section-title">Staged Changes</span>
                        <div class="header-actions">
                            <div class="action-icon" title="Unstager toutes les modifications" onclick="event.stopPropagation(); post('unstageAll')">
                                <svg viewBox="0 0 16 16"><path d="M13 7H3v2h10V7z"/></svg>
                            </div>
                        </div>
                        <span id="staged-badge" class="badge">0</span>
                    </div>
                    <div id="staged-list" class="file-list"></div>
                </div>
                <div id="unstaged-section" class="changes-section">
                    <div class="section-header">
                        <svg class="chevron" viewBox="0 0 16 16"><path d="M7.976 10.072l4.357-4.357.62.618L8.285 11l-.618-.618L3.31 6.025l.619-.618 4.047 4.665z"/></svg>
                        <span class="section-title">Changes</span>
                        <div class="header-actions">
                            <div class="action-icon" title="Annuler toutes les modifications" onclick="event.stopPropagation(); post('discardAll')">
                                <svg viewBox="0 0 16 16"><path d="M10.3 6.74l-.7.71L8 5.86l-1.6 1.6-.7-.71L7.29 5.15 5.69 3.55l.7-.71L8 4.44l1.6-1.6.7.71-1.59 1.6 1.59 1.59zM8 1a7 7 0 1 0 7 7 7 7 0 0 0-7-7zm0 13a6 6 0 1 1 6-6 6 6 0 0 1-6 6z"/></svg>
                            </div>
                            <div class="action-icon" title="Stager toutes les modifications" onclick="event.stopPropagation(); post('stageAll')">
                                <svg viewBox="0 0 16 16"><path d="M14 7H9V2H7v5H2v2h5v5h2V9h5z"/></svg>
                            </div>
                        </div>
                        <span id="unstaged-badge" class="badge">0</span>
                    </div>
                    <div id="unstaged-list" class="file-list"></div>
                </div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                const post = (type, payload = {}) => vscode.postMessage({ type, ...payload });

                const textarea = document.getElementById('commit-message');
                
                textarea.addEventListener('input', function() {
                    this.style.height = '30px';
                    this.style.height = (this.scrollHeight) + 'px';
                });

                document.querySelectorAll('.section-header').forEach(header => {
                    header.addEventListener('click', () => {
                        const section = header.parentElement;
                        section.classList.toggle('collapsed');
                    });
                });

                document.getElementById('generate-btn').onclick = () => post('generate');
                
                const handleCommit = () => {
                    const message = textarea.value;
                    if (message.trim()) {
                        post('commit', { message });
                        textarea.value = '';
                        textarea.style.height = '30px';
                    }
                };

                document.getElementById('commit-btn').onclick = handleCommit;

                textarea.addEventListener('keydown', (e) => {
                    if (e.ctrlKey && e.key === 'Enter') {
                        handleCommit();
                    }
                });

                post('ready');

                window.addEventListener('message', event => {
                    if (event.data.type === 'updateGitStatus') {
                        updateFileList('staged', event.data.staged);
                        updateFileList('unstaged', event.data.unstaged);
                    } else if (event.data.type === 'setCommitMessage') {
                        textarea.value = event.data.message;
                        textarea.style.height = '30px';
                        textarea.style.height = (textarea.scrollHeight) + 'px';
                    }
                });

                function updateFileList(id, files) {
                    const list = document.getElementById(id + '-list');
                    document.getElementById(id + '-badge').textContent = files.length;
                    list.innerHTML = '';
                    
                    files.forEach(file => {
                        const item = document.createElement('div');
                        item.className = 'file-item';
                        const isStaged = id === 'staged';
                        const color = file.status === 'untracked' ? '#73c991' : '#519aba';
                        
                        item.innerHTML = \`
                            <div class="file-icon"><svg width="14" height="14" viewBox="0 0 16 16" fill="\${color}"><path d="M14.7 13.14l-1.1-9.98c-.03-.3-.12-.55-.38-.7l-5-3.03c-.2-.12-.46-.17-.7-.12s-.45.16-.58.35L3.1 5.37c-.17.26-.23.56-.2.86l1.1 9.98c.03.3.12.55.38.7l5 3.03c.2.12.46.17.7.12s.45-.16.58-.35l3.86-5.71c.17-.26.23-.56.2-.86zM8.44 1.7 l3.83 2.32-2.9 4.3h-1.3l.37-5.55q.02-.33.22-.52t.54-.19l.71.01-.2-.41L8.44 1.7z"/></svg></div>
                            <div class="file-label">
                                <span class="file-name">\${file.name}</span>
                                <span class="file-path">\${file.path}</span>
                            </div>
                            <div class="file-actions">
                                \${isStaged ? 
                                    '<div class="action-icon btn-unstage" title="Unstage"><svg viewBox="0 0 16 16"><path d="M13 7H3v2h10V7z"/></svg></div>' : 
                                    '<div class="action-icon btn-discard" title="Discard"><svg viewBox="0 0 16 16"><path d="M10.3 6.74l-.7.71L8 5.86l-1.6 1.6-.7-.71L7.29 5.15 5.69 3.55l.7-.71L8 4.44l1.6-1.6.7.71-1.59 1.6 1.59 1.59zM8 1a7 7 0 1 0 7 7 7 7 0 0 0-7-7zm0 13a6 6 0 1 1 6-6 6 6 0 0 1-6 6z"/></svg></div><div class="action-icon btn-stage" title="Stage"><svg viewBox="0 0 16 16"><path d="M14 7H9V2H7v5H2v2h5v5h2V9h5z"/></svg></div>'
                                }
                            </div>
                            <span class="status-icon status-\${file.status === 'untracked' ? 'u' : 'm'}">\${file.status === 'untracked' ? 'U' : 'M'}</span>
                        \`;
                        
                        item.querySelector('.file-label').onclick = () => post('openFile', { uri: file.uri });
                        if (isStaged) {
                            item.querySelector('.btn-unstage').onclick = (e) => { e.stopPropagation(); post('unstage', { uri: file.uri }); };
                        } else {
                            item.querySelector('.btn-discard').onclick = (e) => { e.stopPropagation(); post('discard', { uri: file.uri }); };
                            item.querySelector('.btn-stage').onclick = (e) => { e.stopPropagation(); post('stage', { uri: file.uri }); };
                        }
                        list.appendChild(item);
                    });
                }
            </script>
        </body>
        </html>`;
    }
}
