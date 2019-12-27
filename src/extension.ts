// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {KubeNodeProvider, KubeObject} from './KubeNodeProvider'



// this method is called when your extension is activated
// your extension is activated the very first time the command is executed


const myProvider = new class implements vscode.TextDocumentContentProvider {
	provideTextDocumentContent(uri: vscode.Uri): string {
		return uri.path
	}
};

/**
 * @param {vscode.ExtensionContext} context
 */
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vskube" is now active!');
	vscode.window.registerTreeDataProvider('kube-namespaces', new KubeNodeProvider());

	vscode.commands.registerCommand('extension.openYaml', async (title, yaml) => {

		console.log("Opening Page,",title,yaml);
		let uri = vscode.Uri.parse('yaml:' + yaml);
		
		let doc = await vscode.workspace.openTextDocument(uri);

		await vscode.window.showTextDocument(doc, { preview: true,});
	});

	vscode.workspace.registerTextDocumentContentProvider('yaml', myProvider);

}

// this method is called when your extension is deactivated
export function deactivate() {}



