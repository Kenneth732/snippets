

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * Function to activate the extension.
 * @param {vscode.ExtensionContext} context - The context in which the extension is activated.
 */
function activate(context) {
    console.log('Congratulations, your extension "my-meaningful-extension" is now active!');

    // Register commands for generating snippets
    const disposableJavaScript = vscode.commands.registerCommand('extension.generateSnippetJavaScript', async function () {
        await generateSnippet('javascript');
    });

    const disposableTypeScript = vscode.commands.registerCommand('extension.generateSnippetTypeScript', async function () {
        await generateSnippet('typescript');
    });

    const disposableHTML = vscode.commands.registerCommand('extension.generateSnippetHTML', async function () {
        await generateSnippet('html');
    });

    // Register commands for updating and deleting snippets
    const disposableUpdateSnippet = vscode.commands.registerCommand('extension.updateSnippet', async function () {
        await updateSnippet();
    });

    const disposableDeleteSnippet = vscode.commands.registerCommand('extension.deleteSnippet', async function () {
        await deleteSnippet();
    });

    // Add commands to context subscriptions
    context.subscriptions.push(
        disposableJavaScript,
        disposableTypeScript,
        disposableHTML,
        disposableUpdateSnippet,
        disposableDeleteSnippet
    );
}

/**
 * Function to generate a snippet for a specific language.
 * @param {string} language - The programming language of the snippet (javascript/typescript/html).
 */
async function generateSnippet(language) {
    const snippetName = await vscode.window.showInputBox({
        prompt: vscode.workspace.getConfiguration().get('my-meaningful-extension.snippetNamePrompt', `Enter a name for your ${language} snippet`),
        placeHolder: 'exampleSnippet'
    });

    if (!snippetName) {
        vscode.window.showErrorMessage(vscode.workspace.getConfiguration().get('my-meaningful-extension.snippetNameRequiredMessage', 'Snippet generation canceled: snippet name is required.'));
        return;
    }

    const snippetContent = await vscode.window.showInputBox({
        prompt: vscode.workspace.getConfiguration().get('my-meaningful-extension.snippetContentPrompt', `Enter the ${language} snippet content`),
        placeHolder: `// Your ${language} snippet content here...`
    });

    if (!snippetContent) {
        vscode.window.showErrorMessage(vscode.workspace.getConfiguration().get('my-meaningful-extension.snippetContentRequiredMessage', 'Snippet generation canceled: snippet content is required.'));
        return;
    }

    try {
        const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const snippetFolderPath = path.join(workspaceFolder, '.vscode', 'snippets');

        if (!fs.existsSync(snippetFolderPath)) {
            fs.mkdirSync(snippetFolderPath, { recursive: true });
        }

        const snippetFileName = `${snippetName}.${language}.json`;
        const snippetFilePath = path.join(snippetFolderPath, snippetFileName);
        const snippetFileContent = {
            [language]: {
                [snippetName]: {
                    prefix: snippetName,
                    body: snippetContent.split('\n'),
                    description: vscode.workspace.getConfiguration().get('my-meaningful-extension.snippetDescription', `Custom ${language} snippet - ${snippetName}`)
                }
            }
        };

        fs.writeFileSync(snippetFilePath, JSON.stringify(snippetFileContent, null, 4));

        vscode.window.showInformationMessage(vscode.workspace.getConfiguration().get('my-meaningful-extension.snippetGeneratedSuccessfullyMessage', `Snippet "${snippetName}" generated successfully!`));
    } catch (err) {
        vscode.window.showErrorMessage(vscode.workspace.getConfiguration().get('my-meaningful-extension.snippetGenerationFailedMessage', `Failed to generate snippet: ${err.message}`));
    }
}

/**
 * Function to update a snippet.
 */
async function updateSnippet() {
    const snippetFile = await vscode.window.showQuickPick(getSnippets(), {
        placeHolder: vscode.workspace.getConfiguration().get('my-meaningful-extension.selectSnippetToUpdatePlaceholder', 'Select snippet to update')
    });

    if (!snippetFile) {
        return;
    }

    try {
        const snippetFilePath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.vscode', 'snippets', snippetFile);
        const snippetContent = fs.readFileSync(snippetFilePath, 'utf8');
        const snippetObject = JSON.parse(snippetContent);

        const snippetName = Object.keys(snippetObject[Object.keys(snippetObject)[0]])[0];

        const snippetNameInput = vscode.window.createInputBox();
        snippetNameInput.value = snippetName;
        snippetNameInput.prompt = vscode.workspace.getConfiguration().get('my-meaningful-extension.updateSnippetNamePrompt', 'Enter a new name for your snippet');
        snippetNameInput.placeholder = 'exampleSnippet';
        snippetNameInput.title = 'Snippet Name';
        const newSnippetName = await new Promise((resolve) => {
            snippetNameInput.show();
            snippetNameInput.onDidAccept(() => {
                resolve(snippetNameInput.value);
                snippetNameInput.hide();
            });
        });

        if (!newSnippetName) {
            vscode.window.showErrorMessage(vscode.workspace.getConfiguration().get('my-meaningful-extension.snippetUpdateCanceledMessage', 'Snippet update canceled: snippet name is required.'));
            return;
        }

        const snippetContentInput = vscode.window.createInputBox();
        snippetContentInput.value = snippetObject[Object.keys(snippetObject)[0]][snippetName].body.join('\n');
        snippetContentInput.prompt = vscode.workspace.getConfiguration().get('my-meaningful-extension.updateSnippetContentPrompt', 'Enter the snippet content');
        snippetContentInput.placeholder = `// Your snippet content here...`;
        snippetContentInput.title = 'Snippet Content';
        const newSnippetContent = await new Promise((resolve) => {
            snippetContentInput.show();
            snippetContentInput.onDidAccept(() => {
                resolve(snippetContentInput.value);
                snippetContentInput.hide();
            });
        });

        if (!newSnippetContent) {
            vscode.window.showErrorMessage(vscode.workspace.getConfiguration().get('my-meaningful-extension.snippetUpdateCanceledMessage', 'Snippet update canceled: snippet content is required.'));
            return;
        }

        delete snippetObject[Object.keys(snippetObject)[0]][snippetName];
        snippetObject[Object.keys(snippetObject)[0]][newSnippetName] = {
            prefix: newSnippetName,
            body: newSnippetContent.split('\n'),
            description: vscode.workspace.getConfiguration().get('my-meaningful-extension.snippetDescription', `Custom snippet - ${newSnippetName}`)
        };

        fs.writeFileSync(snippetFilePath, JSON.stringify(snippetObject, null, 4));

        vscode.window.showInformationMessage(vscode.workspace.getConfiguration().get('my-meaningful-extension.snippetUpdatedSuccessfullyMessage', `Snippet "${newSnippetName}" updated successfully!`));
    } catch (err) {
        vscode.window.showErrorMessage(vscode.workspace.getConfiguration().get('my-meaningful-extension.snippetUpdateFailedMessage', `Failed to update snippet: ${err.message}`));
    }
}

/**
 * Function to delete a snippet.
 */
async function deleteSnippet() {
    const snippetFile = await vscode.window.showQuickPick(getSnippets(), {
        placeHolder: vscode.workspace.getConfiguration().get('my-meaningful-extension.selectSnippetToDeletePlaceholder', 'Select snippet to delete')
    });

    if (!snippetFile) {
        return;
    } try {
        const snippetFilePath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.vscode', 'snippets', snippetFile);
        fs.unlinkSync(snippetFilePath);
        vscode.window.showInformationMessage(vscode.workspace.getConfiguration().get('my-meaningful-extension.snippetDeletedSuccessfullyMessage', `Snippet "${snippetFile}" deleted successfully!`));
    } catch (err) {
        vscode.window.showErrorMessage(vscode.workspace.getConfiguration().get('my-meaningful-extension.snippetDeletionFailedMessage', `Failed to delete snippet: ${err.message}`));
    }
}

/**
 * Function to get a list of snippets in the snippets folder.
 * @returns {string[]} An array of snippet file names.
 */
function getSnippets() {
    const snippetFolderPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.vscode', 'snippets');
    if (!fs.existsSync(snippetFolderPath)) {
        return [];
    }

    return fs.readdirSync(snippetFolderPath);
}

/**
 * Function to deactivate the extension.
 */
function deactivate() {}

// Exporting functions and commands
module.exports = {
    activate,
    deactivate
};

