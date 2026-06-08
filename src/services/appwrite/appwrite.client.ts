import { Account, Client, TablesDB } from "appwrite";

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;

if (!endpoint) {
	throw new Error("Missing VITE_APPWRITE_ENDPOINT env variable");
}

if (!projectId) {
	throw new Error("Missing VITE_APPWRITE_PROJECT_ID env variable");
}

export const appwriteClient = new Client()
	.setEndpoint(endpoint)
	.setProject(projectId);

export const account = new Account(appwriteClient);
export const tablesDB = new TablesDB(appwriteClient);
