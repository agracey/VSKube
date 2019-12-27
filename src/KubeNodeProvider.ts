import * as vscode from 'vscode';
import * as k8s from '@kubernetes/client-node';
import * as yaml from 'js-yaml';
import { V1Pod } from '@kubernetes/client-node';

const kc = new k8s.KubeConfig();
kc.loadFromDefault()

const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
const k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);

interface ObjectSpec {
	name:string
	getter:any
}

const NamespacedTypes = [
	{name: 'V1Pod', getter: k8sCoreApi.listNamespacedPod},
	{name: 'V1Deployment', getter: k8sAppsApi.listNamespacedDeployment},
	{name: 'V1StatefulSet', getter: k8sAppsApi.listNamespacedStatefulSet},
	
]


export class KubeNodeProvider implements vscode.TreeDataProvider<KubeObject> {

	private _onDidChangeTreeData: vscode.EventEmitter<KubeObject | undefined> = new vscode.EventEmitter<KubeObject | undefined>();
	readonly onDidChangeTreeData: vscode.Event<KubeObject | undefined> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: KubeObject): vscode.TreeItem {
		return element;
	}

	getChildren(element?: KubeObject): Thenable<KubeObject[]> {

		if(!element) {
			return this.getNamespaces()
		}

		if(element.type ==='Namespace') {
			return Promise.resolve(NamespacedTypes.map(({name}):NamespacedTypesObject=>(
				new NamespacedTypesObject(name, element.namespace, vscode.TreeItemCollapsibleState.Collapsed)
			)))
		}

		const type = NamespacedTypes.find((t)=>(t.name==element.type))
		if(type) {
			return this.getObjectForNamespace(type, element.namespace)
		}
	
		return Promise.resolve([])
	}

	async getNamespaces(): Promise<NamespaceObject[]> {
		const nsList = await k8sCoreApi.listNamespace()
		return nsList.body.items.map((value:k8s.V1Namespace)=>(
			new NamespaceObject( (value.metadata && value.metadata.name)? value.metadata.name:'na', vscode.TreeItemCollapsibleState.Collapsed)
		))
	}

	async getObjectForNamespace(objectSpec:ObjectSpec, namespace:string): Promise<YamlObject[]> {
		const nsList = await objectSpec.getter(namespace)

		return nsList.body.items.map((value: any)=>(

			new YamlObject((value.metadata && value.metadata.name)? value.metadata.name:'na', 
			objectSpec.name, 
			namespace, yaml.safeDump(JSON.parse(JSON.stringify(value))))
		))

	}
}

export class KubeObject extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		public readonly namespace: string,
		public readonly collapsibleState?: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);
	}

	get tooltip(): string {
		return `tooltip`;
	}

	get description(): string {
		return ''
	}

	get type():string {
		return 'none'
	}
}

export class NamespaceObject extends KubeObject {

	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
	) {
		super(label, label, collapsibleState);
	}

	get tooltip(): string {
		return `tooltip`;
	}

	get description(): string {
		return 'NS'
	}

	get type():string {
		return 'Namespace'
	}
}

export class NamespacedTypesObject extends KubeObject {

	constructor(
		public readonly label: string,
		public readonly namespace: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
	) {
		super(label, namespace, collapsibleState);
	}

	get type(): string {
		return this.label
	}

	get description(): string {
		return 'Type'
	}
}

function buildOpenCommand(label:string, yaml:string){
	return { command: 'extension.openYaml', title: "Open", arguments: [label, yaml], }
}

export class YamlObject extends KubeObject {

	constructor(
		public readonly label: string,
		public readonly objectType: string,
		public readonly namespace: string,
		public readonly yaml: string
	) {
		super(label, namespace, vscode.TreeItemCollapsibleState.None, buildOpenCommand(label,yaml));
	}

	get description(): string {
		return this.objectType
	}

	get type():string {
		return 'Object'
	}
}